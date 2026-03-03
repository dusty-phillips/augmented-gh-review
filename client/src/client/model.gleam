import gleam/option
import gleam/uri.{type Uri}
import rsvp
import shared/pr.{
  type AnalysisResult, type LineComment, type PrComment, type PrDetail,
  type PrGroups,
}

pub type View {
  Dashboard
  PrReview
}

pub type Model {
  Model(
    repos: List(String),
    active_repo: String,
    pr_groups: option.Option(PrGroups),
    selected_pr: option.Option(PrDetail),
    loading: Bool,
    view: View,
    error: option.Option(String),
    analysis: option.Option(AnalysisResult),
    current_chunk: Int,
    comments: List(LineComment),
    commenting_line: option.Option(Int),
    comment_text: String,
    github_comments: List(PrComment),
    posting_comment: Bool,
    stream_heartbeats: Int,
    description_open: Bool,
    review_body: String,
    submitting_review: Bool,
  )
}

pub type Msg {
  GotPrs(Result(PrGroups, rsvp.Error))
  GotPrDetail(Result(PrDetail, rsvp.Error))
  SelectPr(Int)
  SetRepo(String)
  BackToDashboard
  FetchPrs
  AnalyzePr
  GotAnalysis(Result(AnalysisResult, rsvp.Error))
  SseAnalysisComplete(String)
  SseAnalysisError(String)
  SseHeartbeat(String)
  SseConnectionError(String)
  NextChunk
  PrevChunk
  GoToChunk(Int)
  StartComment(Int)
  CancelComment
  UpdateCommentText(String)
  SubmitComment
  GotGithubComments(Result(List(PrComment), rsvp.Error))
  CommentPosted(Result(Nil, rsvp.Error))
  UrlChanged(Uri)
  ToggleDescription
  SubmitReview(String)
  SetReviewBody(String)
  ReviewSubmitted(Result(Nil, rsvp.Error))
}
