# TFLint for Terragrunt-generated Terraform (github provider modules).
# Filename is tflint.hcl (not .tflint.hcl) so Terragrunt does not auto-hook it.
# Used by root.hcl before_hook "run_tflint" and `make tg-lint`.

tflint {
  required_version = ">= 0.50"
}

config {
  call_module_type    = "local"
  force               = false
  disabled_by_default = false
  format              = "compact"
}

plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

rule "terraform_comment_syntax" {
  enabled = true
}

rule "terraform_deprecated_index" {
  enabled = true
}

rule "terraform_deprecated_interpolation" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = false
}

rule "terraform_documented_variables" {
  enabled = false
}

rule "terraform_module_pinned_source" {
  enabled = true
  style   = "flexible"
}

rule "terraform_naming_convention" {
  enabled = true
  format  = "snake_case"
}

rule "terraform_required_providers" {
  enabled = true
}

rule "terraform_required_version" {
  enabled = true
}

rule "terraform_standard_module_structure" {
  enabled = false
}

rule "terraform_typed_variables" {
  enabled = true
}

rule "terraform_unused_declarations" {
  enabled = true
}

rule "terraform_unused_required_providers" {
  enabled = true
}
