# Terraform Infrastructure

Terraform was implemented in `devorecruiter/infrastructure/terraform` because no separate `devorecruiter-infra` repository exists in the workspace.

## Files

- `.gitignore`: excludes state, plans, local variables, and `.terraform`.
- `versions.tf`: pins Terraform and AzureRM provider constraints and declares an AzureRM backend.
- `providers.tf`: configures AzureRM with explicit subscription input and no automatic provider registration.
- `variables.tf`: defines budget-aware VM, network, CIDR, and safety variables.
- `locals.tf`: centralizes names and tags.
- `main.tf`: defines RG, VNet, subnet, NSG, public IP, NIC, Linux VM, and managed identity behind `enable_infrastructure`.
- `outputs.tf`: exposes selected Azure resource names and IP.
- `terraform.tfvars.example`: safe local starting point.

Status: `VERIFIED`.

Validation status: `VERIFIED` locally.

Latest evidence:

- Azure subscription visible: `Azure for Students` / `acec6a34-0f38-4da1-9e5b-6335ff6efc80`.
- Existing resource group: `rg-devorecruiter-dev`.
- Existing VM: `vm-devorecruiter-dev`, public IP `68.221.76.45`.
- Imported Terraform resources:
  - `azurerm_resource_group.this[0]`;
  - `azurerm_virtual_network.this[0]`;
  - `azurerm_subnet.k3s[0]`;
  - `azurerm_network_security_group.k3s[0]`;
  - `azurerm_public_ip.k3s[0]`;
  - `azurerm_network_interface.k3s[0]`;
  - `azurerm_network_interface_security_group_association.k3s[0]`;
  - `azurerm_linux_virtual_machine.k3s[0]`.
- `terraform validate`: success.
- `terraform plan -input=false -no-color` with `enable_infrastructure=true`: `No changes. Your infrastructure matches the configuration.`

Rollback: revert the Terraform commit, run `terraform plan`, review the inverse plan, and apply only after approval. Terraform is not a magic rollback system.
