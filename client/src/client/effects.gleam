import client/model.{type Msg, GotPrDetail, GotPrs}
import gleam/int
import lustre/effect
import rsvp
import shared/pr

pub fn fetch_prs(repo: String) -> effect.Effect(Msg) {
  rsvp.get(
    "/api/prs?repo=" <> repo,
    rsvp.expect_json(pr.pull_request_list_decoder(), GotPrs),
  )
}

pub fn fetch_pr_detail(repo: String, number: Int) -> effect.Effect(Msg) {
  rsvp.get(
    "/api/prs/" <> int.to_string(number) <> "?repo=" <> repo,
    rsvp.expect_json(pr.pr_detail_decoder(), GotPrDetail),
  )
}
