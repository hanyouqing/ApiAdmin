# terraform-github-modules source pin.
# Remote default; sibling local clone for debugging (same ~/github.com/<owner>/<Repo> layout).
locals {
  modules_git = "git::ssh://git@github.com/hanyouqing/terraform-github-modules.git"
  modules_ref = "76612569a61af4dbf5c9d5f4f2e01c1563892108"

  # Local: dirname(ApiAdmin) / terraform-github-modules → ~/github.com/hanyouqing/terraform-github-modules
  modules_local = "${dirname(get_repo_root())}/terraform-github-modules"
}
