import client/effects
import client/model.{
  type Model, type Msg, AnalyzePr, BackToDashboard, CancelComment,
  CommentPosted, Dashboard, FetchPrs, GoToChunk, GotAnalysis,
  GotGithubComments, GotPrDetail, GotPrs, Model, NextChunk, PrevChunk,
  PrReview, ReviewSubmitted, SelectPr, SetRepo, SetReviewBody,
  SseAnalysisComplete, SseAnalysisError, SseConnectionError, SseHeartbeat,
  StartComment, SubmitComment, SubmitReview, ToggleDescription,
  UpdateCommentText, UrlChanged,
}
import client/views/dashboard
import client/views/pr_review
import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
import gleam/option
import gleam/string
import gleam/uri
import lustre
import lustre/effect
import lustre/element.{type Element}
import modem
import rsvp
import shared/pr

pub fn main() {
  let app = lustre.application(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)
  Nil
}

fn format_error(err: rsvp.Error) -> String {
  case err {
    rsvp.NetworkError -> "Network error — is the server running?"
    rsvp.HttpError(response) ->
      "Server error (" <> int.to_string(response.status) <> "): " <> response.body
    rsvp.JsonError(_) -> "Failed to parse server response"
    rsvp.BadBody -> "Bad response body"
    rsvp.BadUrl(url) -> "Bad URL: " <> url
    rsvp.UnhandledResponse(response) ->
      "Unexpected response (" <> int.to_string(response.status) <> ")"
  }
}

fn init(_flags: Nil) -> #(Model, effect.Effect(Msg)) {
  let default_repo = "GC-AI-Inc/app-gc-ai"

  // Check the initial URL to determine if we should load a specific PR
  let #(initial_view, initial_loading, initial_effect) =
    case modem.initial_uri() {
      Ok(uri) ->
        case parse_route(uri) {
          PrRoute(number) -> #(
            PrReview,
            True,
            effect.batch([
              effects.fetch_prs(default_repo),
              effects.fetch_pr_detail(default_repo, number),
            ]),
          )
          DashboardRoute -> #(
            Dashboard,
            True,
            effects.fetch_prs(default_repo),
          )
        }
      Error(_) -> #(Dashboard, True, effects.fetch_prs(default_repo))
    }

  #(
    Model(
      repos: [default_repo],
      active_repo: default_repo,
      pr_groups: option.None,
      selected_pr: option.None,
      loading: initial_loading,
      view: initial_view,
      error: option.None,
      analysis: option.None,
      current_chunk: 0,
      comments: [],
      commenting_line: option.None,
      comment_text: "",
      github_comments: [],
      posting_comment: False,
      stream_heartbeats: 0,
      description_open: False,
      review_body: "",
      submitting_review: False,
    ),
    effect.batch([modem.init(UrlChanged), initial_effect]),
  )
}

type Route {
  DashboardRoute
  PrRoute(Int)
}

fn parse_route(uri: uri.Uri) -> Route {
  let path = uri.path
  let segments =
    path
    |> string.split("/")
    |> list.filter(fn(s) { s != "" })

  case segments {
    ["pr", number_str] ->
      case int.parse(number_str) {
        Ok(number) -> PrRoute(number)
        Error(_) -> DashboardRoute
      }
    _ -> DashboardRoute
  }
}

fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  case msg {
    FetchPrs -> #(
      Model(..model, loading: True, pr_groups: option.None, error: option.None),
      effects.fetch_prs(model.active_repo),
    )

    SetRepo(repo) -> #(Model(..model, active_repo: repo), effect.none())

    GotPrs(Ok(groups)) -> #(
      Model(..model, pr_groups: option.Some(groups), loading: False, error: option.None),
      effect.none(),
    )

    GotPrs(Error(err)) -> #(
      Model(..model, loading: False, error: option.Some(format_error(err))),
      effect.none(),
    )

    SelectPr(number) -> #(
      Model(
        ..model,
        loading: True,
        view: PrReview,
        error: option.None,
        analysis: option.None,
        current_chunk: 0,
        comments: [],
        commenting_line: option.None,
        comment_text: "",
        github_comments: [],
        posting_comment: False,
        stream_heartbeats: 0,
        review_body: "",
        submitting_review: False,
      ),
      effect.batch([
        effects.push_url("/pr/" <> int.to_string(number)),
        effects.fetch_pr_detail(model.active_repo, number),
      ]),
    )

    GotPrDetail(Ok(detail)) -> #(
      Model(
        ..model,
        selected_pr: option.Some(detail),
        loading: False,
        error: option.None,
      ),
      effects.fetch_github_comments(model.active_repo, detail.number),
    )

    GotPrDetail(Error(err)) -> #(
      Model(..model, loading: False, error: option.Some(format_error(err))),
      effect.none(),
    )

    BackToDashboard -> #(
      Model(
        ..model,
        view: Dashboard,
        selected_pr: option.None,
        error: option.None,
        analysis: option.None,
        current_chunk: 0,
        comments: [],
        commenting_line: option.None,
        comment_text: "",
        github_comments: [],
        posting_comment: False,
        stream_heartbeats: 0,
        review_body: "",
        submitting_review: False,
      ),
      effects.push_url("/"),
    )

    AnalyzePr ->
      case model.selected_pr {
        option.Some(detail) -> #(
          Model(
            ..model,
            loading: True,
            error: option.None,
            stream_heartbeats: 0,
          ),
          effects.analyze_pr_stream(model.active_repo, detail.number),
        )
        option.None -> #(model, effect.none())
      }

    GotAnalysis(Ok(analysis)) -> #(
      Model(
        ..model,
        analysis: option.Some(analysis),
        current_chunk: 0,
        loading: False,
        error: option.None,
      ),
      effect.none(),
    )

    GotAnalysis(Error(err)) -> #(
      Model(..model, loading: False, error: option.Some(format_error(err))),
      effect.none(),
    )

    SseAnalysisComplete(data) -> {
      case json.parse(data, pr.analysis_result_decoder()) {
        Ok(analysis) -> #(
          Model(
            ..model,
            analysis: option.Some(analysis),
            current_chunk: 0,
            loading: False,
            error: option.None,
            stream_heartbeats: 0,
          ),
          effect.none(),
        )
        Error(_) -> #(
          Model(
            ..model,
            loading: False,
            error: option.Some("Failed to parse analysis response"),
            stream_heartbeats: 0,
          ),
          effect.none(),
        )
      }
    }

    SseAnalysisError(data) -> {
      // Try to extract error message from JSON, fall back to raw data
      let error_msg = case json.parse(data, {
        use error <- decode.field("error", decode.string)
        decode.success(error)
      }) {
        Ok(msg) -> msg
        Error(_) -> data
      }
      #(
        Model(
          ..model,
          loading: False,
          error: option.Some("Analysis failed: " <> error_msg),
          stream_heartbeats: 0,
        ),
        effect.none(),
      )
    }

    SseHeartbeat(_data) -> #(
      Model(..model, stream_heartbeats: model.stream_heartbeats + 1),
      effect.none(),
    )

    SseConnectionError(msg) -> #(
      Model(
        ..model,
        loading: False,
        error: option.Some("Connection error: " <> msg),
        stream_heartbeats: 0,
      ),
      effect.none(),
    )

    NextChunk -> {
      let max = case model.analysis {
        option.Some(a) -> list.length(a.chunks) - 1
        option.None -> 0
      }
      let next = case model.current_chunk < max {
        True -> model.current_chunk + 1
        False -> model.current_chunk
      }
      #(
        Model(..model, current_chunk: next, commenting_line: option.None, comment_text: ""),
        effect.none(),
      )
    }

    PrevChunk -> {
      let prev = case model.current_chunk > 0 {
        True -> model.current_chunk - 1
        False -> 0
      }
      #(
        Model(..model, current_chunk: prev, commenting_line: option.None, comment_text: ""),
        effect.none(),
      )
    }

    GoToChunk(n) -> #(
      Model(..model, current_chunk: n, commenting_line: option.None, comment_text: ""),
      effect.none(),
    )

    StartComment(line) -> #(
      Model(..model, commenting_line: option.Some(line), comment_text: ""),
      effect.none(),
    )

    CancelComment -> #(
      Model(..model, commenting_line: option.None, comment_text: ""),
      effect.none(),
    )

    UpdateCommentText(text) -> #(
      Model(..model, comment_text: text),
      effect.none(),
    )

    SubmitComment ->
      case model.commenting_line, model.selected_pr, model.analysis {
        option.Some(line), option.Some(detail), option.Some(analysis) -> {
          let comment =
            pr.LineComment(
              chunk_index: model.current_chunk,
              line_number: line,
              body: model.comment_text,
            )
          // Get file_path from the current chunk
          let file_path = case
            list.drop(analysis.chunks, model.current_chunk)
            |> list.first
          {
            Ok(chunk) -> chunk.file_path
            Error(_) -> ""
          }
          #(
            Model(
              ..model,
              comments: [comment, ..model.comments],
              commenting_line: option.None,
              comment_text: "",
              posting_comment: True,
            ),
            effects.post_github_comment(
              model.active_repo,
              detail.number,
              model.comment_text,
              file_path,
              line,
            ),
          )
        }
        option.Some(line), option.Some(_detail), option.None -> {
          // No analysis loaded, just save locally
          let comment =
            pr.LineComment(
              chunk_index: model.current_chunk,
              line_number: line,
              body: model.comment_text,
            )
          #(
            Model(
              ..model,
              comments: [comment, ..model.comments],
              commenting_line: option.None,
              comment_text: "",
            ),
            effect.none(),
          )
        }
        _, _, _ -> #(model, effect.none())
      }

    GotGithubComments(Ok(comments)) -> #(
      Model(..model, github_comments: comments),
      effect.none(),
    )

    GotGithubComments(Error(err)) -> #(
      Model(..model, error: option.Some(format_error(err))),
      effect.none(),
    )

    CommentPosted(Ok(_)) ->
      case model.selected_pr {
        option.Some(detail) -> #(
          Model(..model, posting_comment: False),
          effects.fetch_github_comments(model.active_repo, detail.number),
        )
        option.None -> #(
          Model(..model, posting_comment: False),
          effect.none(),
        )
      }

    CommentPosted(Error(err)) -> #(
      Model(
        ..model,
        posting_comment: False,
        error: option.Some(format_error(err)),
      ),
      effect.none(),
    )

    SetReviewBody(text) -> #(
      Model(..model, review_body: text),
      effect.none(),
    )

    SubmitReview(event) ->
      case model.selected_pr {
        option.Some(detail) -> #(
          Model(..model, submitting_review: True, error: option.None),
          effects.submit_review(
            model.active_repo,
            detail.number,
            event,
            model.review_body,
          ),
        )
        option.None -> #(model, effect.none())
      }

    ReviewSubmitted(Ok(_)) ->
      case model.selected_pr {
        option.Some(detail) -> #(
          Model(
            ..model,
            submitting_review: False,
            review_body: "",
            error: option.None,
          ),
          effects.fetch_github_comments(model.active_repo, detail.number),
        )
        option.None -> #(
          Model(..model, submitting_review: False, review_body: ""),
          effect.none(),
        )
      }

    ReviewSubmitted(Error(err)) -> #(
      Model(
        ..model,
        submitting_review: False,
        error: option.Some(format_error(err)),
      ),
      effect.none(),
    )

    ToggleDescription -> #(
      Model(..model, description_open: !model.description_open),
      effect.none(),
    )

    UrlChanged(uri) ->
      case parse_route(uri) {
        PrRoute(number) ->
          case model.view {
            // Already viewing this PR, no-op
            PrReview ->
              case model.selected_pr {
                option.Some(detail) if detail.number == number -> #(
                  model,
                  effect.none(),
                )
                _ -> #(
                  Model(
                    ..model,
                    loading: True,
                    view: PrReview,
                    error: option.None,
                    analysis: option.None,
                    current_chunk: 0,
                    comments: [],
                    commenting_line: option.None,
                    comment_text: "",
                    github_comments: [],
                    posting_comment: False,
                    stream_heartbeats: 0,
                    review_body: "",
                    submitting_review: False,
                  ),
                  effects.fetch_pr_detail(model.active_repo, number),
                )
              }
            Dashboard -> #(
              Model(
                ..model,
                loading: True,
                view: PrReview,
                error: option.None,
                analysis: option.None,
                current_chunk: 0,
                comments: [],
                commenting_line: option.None,
                comment_text: "",
                github_comments: [],
                posting_comment: False,
                stream_heartbeats: 0,
                review_body: "",
                submitting_review: False,
              ),
              effects.fetch_pr_detail(model.active_repo, number),
            )
          }
        DashboardRoute ->
          case model.view {
            Dashboard -> #(model, effect.none())
            PrReview -> #(
              Model(
                ..model,
                view: Dashboard,
                selected_pr: option.None,
                error: option.None,
                analysis: option.None,
                current_chunk: 0,
                comments: [],
                commenting_line: option.None,
                comment_text: "",
                github_comments: [],
                posting_comment: False,
                stream_heartbeats: 0,
                review_body: "",
                submitting_review: False,
              ),
              effect.none(),
            )
          }
      }
  }
}

fn view(model: Model) -> Element(Msg) {
  case model.view {
    Dashboard -> dashboard.view(model)
    PrReview -> pr_review.view(model)
  }
}
