export interface DocumentTemplate {
	id: string
	name: string
	description: string
	content: string
	isBuiltIn: boolean
}

export const BUILT_IN_DOCUMENT_TEMPLATES: DocumentTemplate[] = [
	{
		id: 'builtin-gdd',
		name: 'Game Design Specification',
		description: 'GDD structure for mechanics, levels, and narrative.',
		isBuiltIn: true,
		content: `# Game Design Specification

## Elevator pitch
One paragraph describing the core fantasy and hook.

## Target audience
Who is this for? What platforms?

## Core loop
1. 
2. 
3. 

## Mechanics
### Primary mechanic
- 

### Secondary mechanics
- 

## Progression
- 

## Art & audio direction
- Visual style:
- Music / SFX mood:

## Level / content outline
| Area | Goal | Notes |
|------|------|-------|
| | | |

## Open questions
- 
`,
	},
	{
		id: 'builtin-project-planning',
		name: 'Project / Event Planning',
		description: 'Goals, timeline, owners, and checklist.',
		isBuiltIn: true,
		content: `# Project / Event Plan

## Summary
What are we doing and why?

## Goals & success criteria
- 

## Key dates
| Milestone | Date | Owner |
|-----------|------|-------|
| Kickoff | | |
| | | |

## Tasks
- [ ] 
- [ ] 

## Budget / resources
- 

## Risks & mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| | | |

## Notes
`,
	},
	{
		id: 'builtin-daily-checkin',
		name: 'Daily Check-In & Reflection',
		description: 'Mood, priorities, wins, and tomorrow.',
		isBuiltIn: true,
		content: `# Daily Check-In

**Date:**

## How I'm feeling
Energy (1–5):  
Mood:  

## Top 3 priorities today
1. 
2. 
3. 

## Wins
- 

## Friction / blockers
- 

## Gratitude
- 

## Tomorrow
One thing to carry forward:
`,
	},
	{
		id: 'builtin-research-dump',
		name: 'Research & Brainstorming Dump',
		description: 'Sources, questions, and idea clusters.',
		isBuiltIn: true,
		content: `# Research & Brainstorm

## Question / topic


## Raw ideas
- 
- 

## Sources
| Source | Link / ref | Key takeaway |
|--------|------------|--------------|
| | | |

## Themes
### Theme 1
- 

### Theme 2
- 

## Next steps
- [ ] 
`,
	},
	{
		id: 'builtin-meeting-notes',
		name: 'Meeting / Interview Notes',
		description: 'Attendees, agenda, decisions, and actions.',
		isBuiltIn: true,
		content: `# Meeting Notes

**Date:**  
**Attendees:**  
**Purpose:**

## Agenda
1. 
2. 

## Discussion
### Topic 1
- 

## Decisions
- 

## Action items
| Owner | Task | Due |
|-------|------|-----|
| | | |

## Follow-up
`,
	},
]
