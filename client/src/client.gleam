import client/effects
import client/model.{
  type Model, type Msg, BackToDashboard, Dashboard, FetchPrs, GotPrDetail,
  GotPrs, Model, PrReview, SelectPr, SetRepo,
}
import client/views/dashboard
import client/views/pr_review
import gleam/option
import lustre
import lustre/effect
import lustre/element.{type Element}

pub fn main() {
  let app = lustre.application(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)
  Nil
}

fn init(_flags: Nil) -> #(Model, effect.Effect(Msg)) {
  let default_repo = "GC-AI-Inc/app-gc-ai"
  #(
    Model(
      repos: [default_repo],
      active_repo: default_repo,
      prs: [],
      selected_pr: option.None,
      loading: True,
      view: Dashboard,
    ),
    effects.fetch_prs(default_repo),
  )
}

fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  case msg {
    FetchPrs -> #(
      Model(..model, loading: True, prs: []),
      effects.fetch_prs(model.active_repo),
    )

    SetRepo(repo) -> #(Model(..model, active_repo: repo), effect.none())

    GotPrs(Ok(prs)) -> #(
      Model(..model, prs: prs, loading: False),
      effect.none(),
    )

    GotPrs(Error(_)) -> #(Model(..model, loading: False), effect.none())

    SelectPr(number) -> #(
      Model(..model, loading: True, view: PrReview),
      effects.fetch_pr_detail(model.active_repo, number),
    )

    GotPrDetail(Ok(detail)) -> #(
      Model(..model, selected_pr: option.Some(detail), loading: False),
      effect.none(),
    )

    GotPrDetail(Error(_)) -> #(Model(..model, loading: False), effect.none())

    BackToDashboard -> #(
      Model(..model, view: Dashboard, selected_pr: option.None),
      effect.none(),
    )
  }
}

fn view(model: Model) -> Element(Msg) {
  case model.view {
    Dashboard -> dashboard.view(model)
    PrReview -> pr_review.view(model)
  }
}
