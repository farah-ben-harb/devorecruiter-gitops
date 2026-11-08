import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import {
  applySavedTerraformPlan,
  createTerraformPlan,
  destroyWithSavedTerraformPlan,
  estimateTerraformChanges,
  getStateSummary,
  getTerraformOutputs,
  getTerraformStatus,
  getTerraformVersion,
  listManagedResources,
  showTerraformPlan,
  validateTerraform,
  type TerraformPlanKind
} from "../../clients/terraform.client.js";
import { getEnvironment } from "../../config/environment.js";
import { assertApprovedDestructiveMutation, assertApprovedMutation } from "../../security/approval.js";
import { recordAuditEvent } from "../../security/audit.js";
import { guardedMutationAnnotations, jsonResult, readOnlyAnnotations, textResult } from "../shared.js";

const planKindSchema = z.enum(["normal", "destroy"]).default("normal");

export function registerTerraformTools(server: McpServer): void {
  server.registerTool(
    "terraform_version",
    {
      title: "Terraform Version",
      description: "Read the local Terraform CLI version.",
      annotations: readOnlyAnnotations()
    },
    async () => jsonResult(await getTerraformVersion(getEnvironment()))
  );

  server.registerTool(
    "terraform_status",
    {
      title: "Terraform Status",
      description: "Summarize the configured Terraform root and safety switches.",
      annotations: readOnlyAnnotations()
    },
    async () => jsonResult(await getTerraformStatus(getEnvironment()))
  );

  server.registerTool(
    "terraform_validate",
    {
      title: "Terraform Validate",
      description: "Run fixed Terraform fmt, init -backend=false, and validate commands.",
      annotations: readOnlyAnnotations()
    },
    async () => jsonResult(await validateTerraform(getEnvironment()))
  );

  server.registerTool(
    "terraform_show_state_summary",
    {
      title: "Terraform State Summary",
      description: "Summarize Terraform-managed resources from state when state exists.",
      annotations: readOnlyAnnotations()
    },
    async () => jsonResult(await getStateSummary(getEnvironment()))
  );

  server.registerTool(
    "terraform_outputs",
    {
      title: "Terraform Outputs",
      description: "Read Terraform outputs when state exists.",
      annotations: readOnlyAnnotations()
    },
    async () => jsonResult(await getTerraformOutputs(getEnvironment()))
  );

  server.registerTool(
    "list_managed_resources",
    {
      title: "List Managed Terraform Resources",
      description: "List Terraform state addresses when state exists.",
      annotations: readOnlyAnnotations()
    },
    async () => jsonResult(await listManagedResources(getEnvironment()))
  );

  server.registerTool(
    "terraform_plan",
    {
      title: "Terraform Plan",
      description: "Create a fixed saved Terraform plan without applying it.",
      annotations: readOnlyAnnotations()
    },
    async () => {
      const environment = getEnvironment();
      const plan = await createTerraformPlan(environment, "normal");
      await recordAuditEvent(environment, {
        action: "terraform_plan",
        target: plan.planPath,
        outcome: "planned",
        details: { add: plan.add, change: plan.change, destroy: plan.destroy }
      });

      return jsonResult(plan);
    }
  );

  server.registerTool(
    "terraform_plan_destroy",
    {
      title: "Terraform Destroy Plan",
      description: "Create a fixed saved destroy plan without applying it.",
      annotations: readOnlyAnnotations()
    },
    async () => {
      const environment = getEnvironment();
      const plan = await createTerraformPlan(environment, "destroy");
      await recordAuditEvent(environment, {
        action: "terraform_plan_destroy",
        target: plan.planPath,
        outcome: "planned",
        details: { add: plan.add, change: plan.change, destroy: plan.destroy }
      });

      return jsonResult(plan);
    }
  );

  server.registerTool(
    "terraform_show_plan",
    {
      title: "Show Terraform Plan",
      description: "Show one fixed saved Terraform plan.",
      inputSchema: {
        kind: planKindSchema
      },
      annotations: readOnlyAnnotations()
    },
    async ({ kind }) => textResult(await showTerraformPlan(getEnvironment(), kind as TerraformPlanKind))
  );

  server.registerTool(
    "terraform_estimate_changes",
    {
      title: "Estimate Terraform Changes",
      description: "Estimate add/change/destroy counts from a fixed saved Terraform plan.",
      inputSchema: {
        kind: planKindSchema
      },
      annotations: readOnlyAnnotations()
    },
    async ({ kind }) => jsonResult(await estimateTerraformChanges(getEnvironment(), kind as TerraformPlanKind))
  );

  server.registerTool(
    "terraform_apply_saved_plan",
    {
      title: "Apply Saved Terraform Plan",
      description: "Apply only the fixed normal saved Terraform plan. Requires mutations and exact confirmation.",
      inputSchema: {
        confirmation: z.string().optional().describe("Required. Must be: APPLY_TERRAFORM_SAVED_PLAN")
      },
      annotations: guardedMutationAnnotations()
    },
    async ({ confirmation }) => {
      const environment = getEnvironment();
      assertApprovedMutation(environment, confirmation, "APPLY_TERRAFORM_SAVED_PLAN");
      const result = await applySavedTerraformPlan(environment);
      await recordAuditEvent(environment, {
        action: "terraform_apply_saved_plan",
        target: result.args.join(" "),
        outcome: "success"
      });

      return jsonResult(result);
    }
  );

  server.registerTool(
    "terraform_destroy",
    {
      title: "Terraform Destroy",
      description: "Apply only the fixed saved destroy plan. Disabled unless mutations and destructive mode are enabled with exact confirmation.",
      inputSchema: {
        confirmation: z.string().optional().describe("Required. Must be: DESTROY_TERRAFORM_SAVED_PLAN")
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ confirmation }) => {
      const environment = getEnvironment();
      assertApprovedDestructiveMutation(environment, confirmation, "DESTROY_TERRAFORM_SAVED_PLAN");
      const result = await destroyWithSavedTerraformPlan(environment);
      await recordAuditEvent(environment, {
        action: "terraform_destroy",
        target: result.args.join(" "),
        outcome: "success"
      });

      return jsonResult(result);
    }
  );
}
