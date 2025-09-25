# Administrator Journey Map

## Scenario A – Respond to Middleware Incident
1. **Alert Intake**
   - Operations Overview raises a critical alert with SLA countdown and suggested assignee.
   - Operator uses quick action to claim the incident and auto-notify collaborators.
2. **Root Cause Investigation**
   - Live telemetry stream highlights spike on transaction queue length.
   - Runbook drawer surfaces "Middleware Queue Drain" checklist; operator reviews logs in context rail.
3. **Mitigation**
   - Operator triggers safe-mode toggle for affected service, then launches backlog drain script from quick actions.
   - Confirmation modal outlines affected modules and rollback plan.
4. **Recovery & Debrief**
   - KPI tiles return to green; operator logs summary in activity feed and attaches postmortem template.

## Scenario B – Resolve Player Escalation
1. **Case Discovery**
   - Support Specialist receives notification tagged "Player Funds Missing".
   - Uses global search to locate player by handle and opens Customer Command Desk workspace.
2. **Investigation**
   - Timeline reveals delayed stock settlement and automated limit freeze.
   - Specialist opens linked market order to verify reconciliation status.
3. **Action**
   - From action drawer, specialist applies "Lift Freeze" with 24-hour review reminder.
   - System generates audit entry and notifies Economy Steward of temporary override.
4. **Follow-Up**
   - Specialist attaches response template to player message center and schedules check-in reminder.

## Scenario C – Launch Double-Yield Weekend
1. **Planning**
   - Economy Steward reviews supply & sink analytics to confirm stability window.
   - Creates draft event in Economy Orchestrator with scoped dates and affected sectors.
2. **Approval**
   - Submits event for governance approval; Security Analyst reviews risk flags and adds conditional guardrails.
3. **Execution**
   - Upon approval, steward activates event; feature flag dependency map confirms no conflicts.
   - Notification center posts countdown for operations and support teams.
4. **Post-Event Review**
   - Analytics snapshot auto-generated and shared to knowledge base.
   - Steward records learnings and updates scenario presets for next iteration.
