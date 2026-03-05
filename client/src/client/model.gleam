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

pub type CommentingState {
  NotCommenting
  Commenting(display_line: Int, file_line: Int, text: String)
  PostingComment(display_line: Int, file_line: Int, text: String)
  Replying(comment_id: Int, text: String)
  PostingReply(comment_id: Int, text: String)
}

pub type ReviewState {
  ReviewIdle(body: String)
  SubmittingReview(body: String)
}

pub type AnalysisState {
  NotAnalyzed
  Analyzing(heartbeats: Int)
  Analyzed(result: AnalysisResult)
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
    analysis_state: AnalysisState,
    current_chunk: Int,
    comments: List(LineComment),
    commenting: CommentingState,
    github_comments: List(PrComment),
    description_open: Bool,
    review: ReviewState,
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
  StartComment(Int, Int)
  CancelComment
  UpdateCommentText(String)
  SubmitComment
  GotGithubComments(Result(List(PrComment), rsvp.Error))
  CommentPosted(Result(Nil, rsvp.Error))
  StartReply(Int)
  SubmitReply
  UrlChanged(Uri)
  ToggleDescription
  SubmitReview(String)
  SetReviewBody(String)
  ReviewSubmitted(Result(Nil, rsvp.Error))
  RefreshPrs
}
