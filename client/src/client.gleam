import client/effects
import client/model.{
  type Model, type Msg, Analyzed, Analyzing, AnalyzePr, BackToDashboard,
  CancelComment, CommentPosted, Commenting, Dashboard, FetchPrs, GoToChunk,
  GotAnalysis, GotGithubComments, GotPrDetail, GotPrs, Model, NextChunk,
  NotAnalyzed, NotCommenting, PostingComment, PostingReply, PrevChunk, PrReview,
  RefreshPrs, Replying, ReviewIdle, ReviewSubmitted, SelectPr, SetRepo,
  SetReviewBody, SseAnalysisComplete, SseAnalysisError, SseConnectionError,
  SseHeartbeat, StartComment, StartReply, SubmitComment, SubmitReply,
  SubmitReview, SubmittingReview, ToggleBotComments, ToggleDescription,
  UpdateCommentText,
  UrlChanged,
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

const default_repo = "GC-AI-Inc/app-gc-ai"

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

/// Default model state for PR review fields, used when resetting.
fn reset_pr_state(model: Model) -> Model {
  Model(
    ..model,
    analysis_state: NotAnalyzed,
    current_chunk: 0,
    comments: [],
    commenting: NotCommenting,
    github_comments: [],
    review: ReviewIdle(body: ""),
  )
}

fn init(_flags: Nil) -> #(Model, effect.Effect(Msg)) {
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
      analysis_state: NotAnalyzed,
      current_chunk: 0,
      comments: [],
      commenting: NotCommenting,
      github_comments: [],
      description_open: False,
      review: ReviewIdle(body: ""),
      hide_bot_comments: False,
    ),
    effect.batch([
      modem.init(UrlChanged),
      initial_effect,
      effects.start_auto_refresh(),
    ]),
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

    // Silent background refresh — no loading state, no clearing existing data
    RefreshPrs -> #(model, effects.fetch_prs(model.active_repo))

    SetRepo(repo) -> #(Model(..model, active_repo: repo), effect.none())

    GotPrs(Ok(groups)) -> #(
      Model(..model, pr_groups: option.Some(groups), loading: False, error: option.None),
      effect.none(),
    )

    GotPrs(Error(err)) -> #(
      Model(..model, loading: False, error: option.Some(format_error(err))),
      effect.none(),
    )

    SelectPr(number) -> {
      let new_model = reset_pr_state(model)
      #(
        Model(
          ..new_model,
          loading: True,
          view: PrReview,
          error: option.None,
        ),
        effect.batch([
          effects.push_url("/pr/" <> int.to_string(number)),
          effects.fetch_pr_detail(model.active_repo, number),
        ]),
      )
    }

    GotPrDetail(Ok(detail)) -> #(
      Model(
        ..model,
        selected_pr: option.Some(detail),
        loading: True,
        error: option.None,
        analysis_state: Analyzing(heartbeats: 0),
      ),
      effect.batch([
        effects.fetch_github_comments(model.active_repo, detail.number),
        effects.analyze_pr_stream(model.active_repo, detail.number),
      ]),
    )

    GotPrDetail(Error(err)) -> #(
      Model(..model, loading: False, error: option.Some(format_error(err))),
      effect.none(),
    )

    BackToDashboard -> {
      let new_model = reset_pr_state(model)
      #(
        Model(
          ..new_model,
          view: Dashboard,
          selected_pr: option.None,
          error: option.None,
        ),
        effects.push_url("/"),
      )
    }

    AnalyzePr ->
      case model.selected_pr {
        option.Some(detail) -> #(
          Model(
            ..model,
            loading: True,
            error: option.None,
            analysis_state: Analyzing(heartbeats: 0),
          ),
          effects.analyze_pr_stream(model.active_repo, detail.number),
        )
        option.None -> #(model, effect.none())
      }

    GotAnalysis(Ok(analysis)) -> #(
      Model(
        ..model,
        analysis_state: Analyzed(result: analysis),
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
            analysis_state: Analyzed(result: analysis),
            current_chunk: 0,
            loading: False,
            error: option.None,
          ),
          effect.none(),
        )
        Error(_) -> #(
          Model(
            ..model,
            loading: False,
            error: option.Some("Failed to parse analysis response"),
            analysis_state: NotAnalyzed,
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
          analysis_state: NotAnalyzed,
        ),
        effect.none(),
      )
    }

    SseHeartbeat(_data) ->
      case model.analysis_state {
        Analyzing(n) -> #(
          Model(..model, analysis_state: Analyzing(heartbeats: n + 1)),
          effect.none(),
        )
        _ -> #(model, effect.none())
      }

    SseConnectionError(msg) -> #(
      Model(
        ..model,
        loading: False,
        error: option.Some("Connection error: " <> msg),
        analysis_state: NotAnalyzed,
      ),
      effect.none(),
    )

    NextChunk -> {
      let max = case model.analysis_state {
        Analyzed(analysis) -> list.length(analysis.chunks) - 1
        NotAnalyzed -> 0
        Analyzing(_) -> 0
      }
      let next = case model.current_chunk < max {
        True -> model.current_chunk + 1
        False -> model.current_chunk
      }
      #(
        Model(..model, current_chunk: next, commenting: NotCommenting),
        effect.none(),
      )
    }

    PrevChunk -> {
      let prev = case model.current_chunk > 0 {
        True -> model.current_chunk - 1
        False -> 0
      }
      #(
        Model(..model, current_chunk: prev, commenting: NotCommenting),
        effect.none(),
      )
    }

    GoToChunk(n) -> #(
      Model(..model, current_chunk: n, commenting: NotCommenting),
      effect.none(),
    )

    StartComment(display_line, file_line) -> #(
      Model(
        ..model,
        commenting: Commenting(
          display_line: display_line,
          file_line: file_line,
          text: "",
        ),
      ),
      effect.none(),
    )

    CancelComment -> #(
      Model(..model, commenting: NotCommenting),
      effect.none(),
    )

    UpdateCommentText(text) ->
      case model.commenting {
        Commenting(dl, fl, _) -> #(
          Model(..model, commenting: Commenting(dl, fl, text)),
          effect.none(),
        )
        PostingComment(dl, fl, _) -> #(
          Model(..model, commenting: PostingComment(dl, fl, text)),
          effect.none(),
        )
        Replying(id, _) -> #(
          Model(..model, commenting: Replying(id, text)),
          effect.none(),
        )
        PostingReply(id, _) -> #(
          Model(..model, commenting: PostingReply(id, text)),
          effect.none(),
        )
        NotCommenting -> #(model, effect.none())
      }

    StartReply(comment_id) -> #(
      Model(..model, commenting: Replying(comment_id, "")),
      effect.none(),
    )

    SubmitReply ->
      case model.commenting, model.selected_pr {
        Replying(comment_id, text), option.Some(detail) -> #(
          Model(..model, commenting: PostingReply(comment_id, text)),
          effects.reply_to_comment(
            model.active_repo,
            detail.number,
            comment_id,
            text,
          ),
        )
        _, _ -> #(model, effect.none())
      }

    SubmitComment -> handle_submit_comment(model)

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
          Model(..model, commenting: NotCommenting),
          effects.fetch_github_comments(model.active_repo, detail.number),
        )
        option.None -> #(
          Model(..model, commenting: NotCommenting),
          effect.none(),
        )
      }

    CommentPosted(Error(err)) -> #(
      Model(
        ..model,
        commenting: NotCommenting,
        error: option.Some(format_error(err)),
      ),
      effect.none(),
    )

    SetReviewBody(text) -> #(
      Model(..model, review: ReviewIdle(body: text)),
      effect.none(),
    )

    SubmitReview(event) -> handle_submit_review(model, event)

    ReviewSubmitted(Ok(_)) ->
      case model.selected_pr {
        option.Some(detail) -> #(
          Model(
            ..model,
            review: ReviewIdle(body: ""),
            error: option.None,
          ),
          effects.fetch_github_comments(model.active_repo, detail.number),
        )
        option.None -> #(
          Model(..model, review: ReviewIdle(body: "")),
          effect.none(),
        )
      }

    ReviewSubmitted(Error(err)) -> #(
      Model(
        ..model,
        review: ReviewIdle(body: case model.review {
          ReviewIdle(body) -> body
          SubmittingReview(body) -> body
        }),
        error: option.Some(format_error(err)),
      ),
      effect.none(),
    )

    ToggleDescription -> #(
      Model(..model, description_open: !model.description_open),
      effect.none(),
    )

    ToggleBotComments -> #(
      Model(..model, hide_bot_comments: !model.hide_bot_comments),
      effect.none(),
    )

    UrlChanged(uri) -> handle_url_changed(model, uri)
  }
}

fn handle_submit_comment(model: Model) -> #(Model, effect.Effect(Msg)) {
  case model.commenting, model.selected_pr, model.analysis_state {
    Commenting(display_line, file_line, text), option.Some(detail), Analyzed(analysis) -> {
      let comment =
        pr.LineComment(
          chunk_index: model.current_chunk,
          line_number: display_line,
          body: text,
        )
      // Get file_path from the current chunk, stripping " (+N more)" suffix
      let file_path = case
        list.drop(analysis.chunks, model.current_chunk)
        |> list.first
      {
        Ok(chunk) ->
          case string.split_once(chunk.file_path, " (+") {
            Ok(#(path, _)) -> path
            Error(_) -> chunk.file_path
          }
        Error(_) -> ""
      }
      #(
        Model(
          ..model,
          comments: [comment, ..model.comments],
          commenting: PostingComment(
            display_line: display_line,
            file_line: file_line,
            text: text,
          ),
        ),
        effects.post_github_comment(
          model.active_repo,
          detail.number,
          text,
          file_path,
          file_line,
        ),
      )
    }
    Commenting(display_line, _, text), option.Some(_), _ -> {
      // No analysis loaded, just save locally
      let comment =
        pr.LineComment(
          chunk_index: model.current_chunk,
          line_number: display_line,
          body: text,
        )
      #(
        Model(
          ..model,
          comments: [comment, ..model.comments],
          commenting: NotCommenting,
        ),
        effect.none(),
      )
    }
    _, _, _ -> #(model, effect.none())
  }
}

fn handle_submit_review(
  model: Model,
  event: String,
) -> #(Model, effect.Effect(Msg)) {
  case model.selected_pr, model.review {
    option.Some(detail), ReviewIdle(body) -> #(
      Model(..model, review: SubmittingReview(body: body), error: option.None),
      effects.submit_review(
        model.active_repo,
        detail.number,
        event,
        body,
      ),
    )
    option.Some(detail), SubmittingReview(body) -> #(
      Model(..model, review: SubmittingReview(body: body), error: option.None),
      effects.submit_review(
        model.active_repo,
        detail.number,
        event,
        body,
      ),
    )
    option.None, _ -> #(model, effect.none())
  }
}

fn handle_url_changed(
  model: Model,
  uri: uri.Uri,
) -> #(Model, effect.Effect(Msg)) {
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
            _ -> {
              let new_model = reset_pr_state(model)
              #(
                Model(
                  ..new_model,
                  loading: True,
                  view: PrReview,
                  error: option.None,
                ),
                effects.fetch_pr_detail(model.active_repo, number),
              )
            }
          }
        Dashboard -> {
          let new_model = reset_pr_state(model)
          #(
            Model(
              ..new_model,
              loading: True,
              view: PrReview,
              error: option.None,
            ),
            effects.fetch_pr_detail(model.active_repo, number),
          )
        }
      }
    DashboardRoute ->
      case model.view {
        Dashboard -> #(model, effect.none())
        PrReview -> {
          let new_model = reset_pr_state(model)
          #(
            Model(
              ..new_model,
              view: Dashboard,
              selected_pr: option.None,
              error: option.None,
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
