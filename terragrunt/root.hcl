# Root Terragrunt — layout:
#   terragrunt/<env>/<account>/<project>/{repository,actions}/
# Example:
#   terragrunt/prod/github/apiadmin/{repository,actions}/
#
# Clone path ~/github.com/<owner>/<Repo> still supplies github_owner / github_repo.
# Modules: https://github.com/hanyouqing/terraform-github-modules
#
# infra tg:
#   infra tg -e prod -s github/apiadmin/repository plan
#   infra tg -e prod -s github/apiadmin/actions plan

locals {
  env_vars     = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  account_vars = read_terragrunt_config(find_in_parent_folders("account.hcl"))

  # Path: …/prod/github/apiadmin/<unit> → project = apiadmin
  project = basename(dirname(path_relative_to_include()))

  env_dir = local.env_vars.locals.environment
  # terraform-github-modules require: development|testing|staging|production
  environment = local.env_dir == "prod" ? "production" : (
    local.env_dir == "stg" ? "staging" : (
      local.env_dir == "dev" ? "development" : (
        local.env_dir == "test" ? "testing" : local.env_dir
      )
    )
  )

  account_name = local.account_vars.locals.account_name

  repo_root         = get_repo_root()
  path_github_owner = basename(dirname(local.repo_root))
  path_github_repo  = basename(local.repo_root)

  github_owner = get_env("GITHUB_OWNER", get_env("TF_VAR_github_owner", local.path_github_owner))
  github_repo  = get_env("GITHUB_REPO", get_env("TF_VAR_github_repo", local.path_github_repo))

  secrets_path = "${get_parent_terragrunt_dir()}/backend.secrets.hcl"
  secrets      = fileexists(local.secrets_path) ? read_terragrunt_config(local.secrets_path) : null

  aws_account_id = try(
    local.secrets.locals.aws_account_id,
    get_env("AWS_ACCOUNT_ID", get_env("TF_VAR_aws_account_id", ""))
  )

  aws_profile = try(
    local.secrets.locals.aws_profile,
    get_env("AWS_PROFILE", get_env("TF_VAR_aws_profile", ""))
  )

  state_region = try(
    local.secrets.locals.state_region,
    get_env("AWS_REGION", get_env("TF_VAR_aws_region", get_env("TF_BACKEND_REGION", "us-east-1")))
  )

  state_bucket = try(
    local.secrets.locals.state_bucket,
    get_env("TF_BACKEND_BUCKET", get_env("TF_VAR_tf_backend_bucket", ""))
  )

  state_lock_table = try(
    local.secrets.locals.state_lock_table,
    get_env("TF_BACKEND_DYNAMODB_TABLE", get_env("TF_VAR_tf_backend_dynamodb_table", ""))
  )

  state_role_arn = try(
    local.secrets.locals.state_role_arn,
    get_env("TF_BACKEND_ROLE_ARN", get_env("TF_VAR_tf_backend_role_arn", ""))
  )

  use_s3_backend = length(trimspace(local.state_bucket)) > 0

  state_key_prefix = length(trimspace(local.aws_account_id)) > 0 ? "github/${local.aws_account_id}/${local.github_owner}/${local.project}" : "github/${local.github_owner}/${local.project}"
  state_key        = "${local.state_key_prefix}/${path_relative_to_include()}/terraform.tfstate"

  s3_backend_config = merge(
    {
      bucket  = local.state_bucket
      key     = local.state_key
      region  = local.state_region
      encrypt = true
    },
    length(trimspace(local.state_lock_table)) > 0 ? { dynamodb_table = local.state_lock_table } : {},
    length(trimspace(local.aws_profile)) > 0 ? { profile = local.aws_profile } : {},
    length(trimspace(local.state_role_arn)) > 0 ? { assume_role = { role_arn = local.state_role_arn } } : {}
  )

  ghcr_image      = "ghcr.io/${local.github_owner}/${local.project}"
  dockerhub_image = "${local.github_owner}/${local.project}"
}

remote_state {
  # Shared by every unit via include "root" — S3 when TF_BACKEND_BUCKET /
  # backend.secrets.hcl is set; otherwise local under .local-state/.
  # https://terragrunt.gruntwork.io/docs/features/keep-your-terraform-code-dry/#remote-state
  backend = local.use_s3_backend ? "s3" : "local"

  disable_dependency_optimization = true

  config = local.use_s3_backend ? local.s3_backend_config : {
    path = "${get_parent_terragrunt_dir()}/.local-state/${path_relative_to_include()}/terraform.tfstate"
  }

  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

terraform {
  extra_arguments "init_reconfigure" {
    commands  = ["init"]
    arguments = ["-reconfigure"]
  }

  # infra tg sets TF_VAR_environment=prod (short path name). Modules require
  # development|testing|staging|production — force the mapped value here.
  extra_arguments "module_vars" {
    commands = [
      "apply",
      "console",
      "destroy",
      "import",
      "init",
      "output",
      "plan",
      "providers",
      "refresh",
      "show",
      "state",
      "validate",
      "version",
    ]
    env_vars = {
      GITHUB_OWNER       = local.github_owner
      TF_VAR_environment = local.environment
      TF_VAR_project     = local.project
    }
  }

  # Do not name this hook "tflint" — Terragrunt then injects every input / TF_VAR
  # as --var (including undeclared github_owner and broken-quoted env vars).
  # Run in the module download dir (cwd for before_hooks with remote source).
  before_hook "run_tflint" {
    commands = ["validate", "plan", "apply"]
    execute = [
      "sh", "-c",
      "tflint --config \"$1\" --minimum-failure-severity=error --var=\"environment=$2\" --var=\"project=$3\"",
      "--",
      "${get_parent_terragrunt_dir()}/tflint.hcl",
      local.environment,
      local.project,
    ]
  }
}

generate "provider" {
  path      = "provider_tg.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<-EOT
    # Generated by Terragrunt — do not edit.
    provider "github" {
      owner = "${local.github_owner}"
    }
  EOT
}

inputs = {
  project     = local.project
  environment = local.environment
  # github_owner is only for provider generate — modules do not declare it.
  tags = {
    Project     = local.project
    Environment = local.environment
    EnvDir      = local.env_dir
    Owner       = local.github_owner
    Repo        = local.github_repo
    Account     = local.account_name
    AwsAccount  = local.aws_account_id
    ManagedBy   = "terragrunt"
  }
}
