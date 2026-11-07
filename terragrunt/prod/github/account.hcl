# Logical account for GitHub platform stacks (not an AWS account).
# Path: terragrunt/<env>/github/account.hcl
#
# infra tg: -e prod -s github/apiadmin/<unit>
#   account=github  region=apiadmin  stack=<unit>

locals {
  account_name = "github"
  # Unused for GitHub provider; kept for parity with infra tg account.hcl.
  account_id = ""
}
