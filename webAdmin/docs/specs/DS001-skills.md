# DS001 - webAdmin Skills and Reporting Logic

The **webAdmin** agent interacts with the information collected by **webCli**.

## Skill: updateLead
- **Function**: Manages the lifecycle of a lead in `leads/`.
- **States**: Transitions a lead from `new` to `invalid`, `contacted`, or `converted`.

## Skill: leadInfo
- **Function**: Displays comprehensive profiling and interaction data for a selected lead.

## Skill: statistics
- **Function**: Aggregates interaction metrics.
- **Reporting Intervals**: Day, week, month, year.
- **Metrics**: Total number of sessions, total leads generated, and leads by specific profile.

## Skill: news
- **Function**: Summarizes recent lead activity.
- **Output**: Recent entries in `leads/` with a brief overview of their status and profile.
