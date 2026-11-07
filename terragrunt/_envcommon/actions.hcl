locals {
  modules = read_terragrunt_config("${dirname(find_in_parent_folders("root.hcl"))}/_envcommon/modules.hcl")
}

terraform {
  # Local debug — uncomment and comment the git source below:
  # source = "${local.modules.locals.modules_local}//actions"
  source = "${local.modules.locals.modules_git}//actions?ref=${local.modules.locals.modules_ref}"
}
