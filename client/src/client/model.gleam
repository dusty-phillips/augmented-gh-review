import gleam/option
import rsvp
import shared/pr.{type PrDetail, type PullRequest}

pub type View {
  Dashboard
  PrReview
}

pub type Model {
  Model(
    repos: List(String),
    active_repo: String,
    prs: List(PullRequest),
    selected_pr: option.Option(PrDetail),
    loading: Bool,
    view: View,
  )
}

pub type Msg {
  GotPrs(Result(List(PullRequest), rsvp.Error))
  GotPrDetail(Result(PrDetail, rsvp.Error))
  SelectPr(Int)
  SetRepo(String)
  BackToDashboard
  FetchPrs
}
