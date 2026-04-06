# DS004 - Skill: statistics

## Goal
To aggregate session and lead metrics over specified time intervals to help the owner gauge site performance.

## Mechanism
An Anthropic-compatible tool used by the webAdmin agent when asked for statistics or reports.

## Tool Definition
- **Name**: `statistics`
- **Description**: Returns numerical summaries of total sessions, total leads, and leads by category over a specified time interval.
- **Inputs**:
  - `interval` (string): The time interval to report. Allowed values: `day`, `week`, `month`, `year`.

## Output
A JSON object containing:
- `totalSessions`: Total number of active/past sessions created in the interval.
- `totalLeads`: Total number of leads created in the interval.
- `leadsByProfile`: An object mapping profile names to their respective counts (e.g., `{"Developer": 5, "Client": 2}`).

## Execution Logic (Node.js)
1. Determine the start and end dates based on the requested `interval`.
2. Scan the `data/sessions/` directory. For this iteration, use file creation/modification times (or parse dates inside if implemented) to count sessions within the interval.
3. Scan the `data/leads/` directory. Parse the files created within the interval to calculate `totalLeads` and aggregate `leadsByProfile`.
4. Return the calculated statistics.
