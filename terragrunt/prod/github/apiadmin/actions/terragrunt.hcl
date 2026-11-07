include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

include "envcommon" {
  path           = "${dirname(find_in_parent_folders("root.hcl"))}/_envcommon/actions.hcl"
  expose         = true
  merge_strategy = "deep"
}

# remote_state + provider generate: defined once in root.hcl (included above).
# https://terragrunt.gruntwork.io/docs/features/keep-your-terraform-code-dry/#remote-state

# Apply/destroy order only (outputs not consumed — repo name comes from path locals).
dependencies {
  paths = ["../repository"]
}

locals {
  repo               = include.root.locals.github_repo
  project            = include.root.locals.project
  owner              = include.root.locals.github_owner
  dockerhub_username = get_env("TF_VAR_dockerhub_username", "")
  dockerhub_token    = get_env("TF_VAR_dockerhub_token", "")
  manage_hub_secrets = length(trimspace(local.dockerhub_username)) > 0 && length(trimspace(local.dockerhub_token)) > 0
}

# Terraform import blocks — source of truth: imports.tftpl
generate "imports" {
  path      = "imports.tf"
  if_exists = "overwrite_terragrunt"
  contents = templatefile("${get_terragrunt_dir()}/imports.tftpl", {
    repo = local.repo
  })
}

inputs = {
  repository_variables = {
    (local.repo) = {
      IMAGE_NAME = {
        value = local.project
      }
      DOCKERHUB_NAMESPACE = {
        value = local.owner
      }
      GHCR_IMAGE = {
        value = include.root.locals.ghcr_image
      }
      DOCKERHUB_IMAGE = {
        value = include.root.locals.dockerhub_image
      }
    }
  }

  repository_encrypted_values = local.manage_hub_secrets ? {
    (local.repo) = {
      DOCKERHUB_USERNAME = {
        plaintext_value = local.dockerhub_username
      }
      DOCKERHUB_TOKEN = {
        plaintext_value = local.dockerhub_token
      }
    }
  } : {}
}
