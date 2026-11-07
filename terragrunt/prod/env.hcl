# Environment tier — outermost path: terragrunt/<env>/env.hcl
# On-disk / infra tg: "prod". Module input "production" is mapped in root.hcl
# (and forced via TF_VAR_environment so infra tg's short name cannot override).

locals {
  environment = "prod"
}
