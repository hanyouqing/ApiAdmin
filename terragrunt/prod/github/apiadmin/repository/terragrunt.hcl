include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

include "envcommon" {
  path           = "${dirname(find_in_parent_folders("root.hcl"))}/_envcommon/repository.hcl"
  expose         = true
  merge_strategy = "deep"
}

# remote_state + provider generate: defined once in root.hcl (included above).
# https://terragrunt.gruntwork.io/docs/features/keep-your-terraform-code-dry/#remote-state
#
# dependencies: none — root unit of this project; ../actions depends on this unit.

locals {
  repo = include.root.locals.github_repo
}

# Terraform import blocks — source of truth: imports.tftpl
generate "imports" {
  path      = "imports.tf"
  if_exists = "overwrite_terragrunt"
  contents = templatefile("${get_terragrunt_dir()}/imports.tftpl", {
    repo = local.repo
  })
}

# GitHub Actions Environment "production" = publish gate for this repo (not a Terragrunt env folder).
inputs = {
  repositories = {
    (local.repo) = {
      description                   = "An API management tool."
      visibility                    = "public"
      has_issues                    = true
      has_projects                  = true
      has_wiki                      = true
      allow_merge_commit            = true
      allow_squash_merge            = true
      allow_rebase_merge            = true
      allow_update_branch           = false
      delete_branch_on_merge        = false
      squash_merge_commit_title     = "COMMIT_OR_PR_TITLE"
      squash_merge_commit_message   = "COMMIT_MESSAGES"
      auto_init                     = false
      archive_on_destroy            = true
      enable_vulnerability_alerts   = true
      enable_dependabot_updates     = true
      enable_default_branch_ruleset = false
      environments = {
        production = {
          wait_timer          = 0
          prevent_self_review = false
          can_admins_bypass   = true
        }
      }
    }
  }
}
