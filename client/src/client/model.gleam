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
  PrFeedback
}

pub type FeedbackState {
  FeedbackState(
    selected_comment_id: option.Option(Int),
    expand_up: Int,
    expand_down: Int,
    whole_file: Bool,
  )
}

pub const feedback_default_radius = 15

pub fn initial_feedback_state() -> FeedbackState {
  FeedbackState(
    selected_comment_id: option.None,
    expand_up: 0,
    expand_down: 0,
    whole_file: False,
  )
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
    hide_bot_comments: Bool,
    feedback: FeedbackState,
  )
}

pub type Msg {
  GotPrs(Result(PrGroups, rsvp.Error))
  RefreshedPrs(Result(PrGroups, rsvp.Error))
  GotPrDetail(Result(PrDetail, rsvp.Error))
  SelectPr(Int)
  SelectPrForFeedback(Int)
  SelectFeedbackComment(Int)
  ExpandFeedbackUp
  ExpandFeedbackDown
  ShowWholeFile
  NextFeedback
  PrevFeedback
  SwitchToAnalysis
  SwitchToFeedback
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
  ToggleBotComments
  SubmitReview(String)
  SetReviewBody(String)
  ReviewSubmitted(Result(Nil, rsvp.Error))
  RefreshPrs
}
