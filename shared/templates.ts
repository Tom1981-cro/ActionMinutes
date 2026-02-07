export interface SummaryTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  prompt: string;
}

export type TemplateCategory = 'general' | 'meeting' | 'medical' | 'interview' | 'education' | 'business';

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'FileText' },
  { id: 'meeting', label: 'Meeting', icon: 'Users' },
  { id: 'medical', label: 'Medical / Healthcare', icon: 'FirstAid' },
  { id: 'interview', label: 'Interview', icon: 'Microphone' },
  { id: 'education', label: 'Education', icon: 'GraduationCap' },
  { id: 'business', label: 'Business / Sales', icon: 'Briefcase' },
];

export const SUMMARY_TEMPLATES: SummaryTemplate[] = [
  {
    id: 'general_summary',
    name: 'Summary',
    description: 'A concise overview of key points and takeaways',
    category: 'general',
    icon: 'FileText',
    prompt: `Summarize the following transcript into a clear, well-structured summary.

TRANSCRIPT:
{{transcript}}

Provide:
1. **Overview** — A brief 2-3 sentence summary of the entire conversation
2. **Key Points** — Bullet list of the most important topics discussed
3. **Takeaways** — Main conclusions or outcomes
4. **Notable Quotes** — Any significant statements worth highlighting

Format the output in clean markdown.`,
  },
  {
    id: 'general_key_points',
    name: 'Key Points',
    description: 'Extract the most important points from the discussion',
    category: 'general',
    icon: 'ListBullets',
    prompt: `Extract the most important points from the following transcript.

TRANSCRIPT:
{{transcript}}

Provide a numbered list of key points, each with:
- A clear, concise statement of the point
- Brief context or supporting detail (1-2 sentences)

Focus on actionable information, decisions, and significant insights. Format in clean markdown.`,
  },
  {
    id: 'general_action_items',
    name: 'Action Items',
    description: 'Extract tasks, assignments, and follow-ups',
    category: 'general',
    icon: 'CheckSquare',
    prompt: `Extract all action items, tasks, and follow-ups from the following transcript.

TRANSCRIPT:
{{transcript}}

For each action item, provide:
- **Task**: Clear description of what needs to be done
- **Assigned to**: Who is responsible (if mentioned)
- **Due date**: When it should be completed (if mentioned)
- **Priority**: High / Medium / Low (based on context)
- **Context**: Brief note on why this was discussed

If no specific person or deadline was mentioned, note "Not specified". Format in clean markdown.`,
  },

  {
    id: 'meeting_minutes',
    name: 'Meeting Minutes',
    description: 'Formal meeting minutes with agenda, discussion, and outcomes',
    category: 'meeting',
    icon: 'Notebook',
    prompt: `Create formal meeting minutes from the following transcript.

TRANSCRIPT:
{{transcript}}

Format the minutes as follows:

# Meeting Minutes

**Date**: [Extract from context or use today's date]
**Attendees**: [List participants mentioned]

## Agenda Items
List the topics that were discussed in order.

## Discussion Summary
For each agenda item, provide:
- Key points discussed
- Different viewpoints or concerns raised
- Any data or figures mentioned

## Decisions Made
List all decisions that were agreed upon.

## Action Items
| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| ... | ... | ... | ... |

## Next Steps
Outline what happens next and any follow-up meetings planned.

Format in clean markdown.`,
  },
  {
    id: 'meeting_highlights',
    name: 'Meeting Highlights',
    description: 'Quick summary of what was discussed and decided',
    category: 'meeting',
    icon: 'HighlighterCircle',
    prompt: `Create a concise highlights summary from the following meeting transcript.

TRANSCRIPT:
{{transcript}}

Provide:
## Highlights
- Top 5-7 most important things discussed (one sentence each)

## Decisions
- Key decisions made during the meeting

## Action Items
- Tasks assigned with owners (if mentioned)

## Key Dates
- Any deadlines or important dates mentioned

Keep it brief and scannable. Format in clean markdown.`,
  },
  {
    id: 'meeting_discussion',
    name: 'Discussion Notes',
    description: 'Detailed notes covering conclusions and next steps',
    category: 'meeting',
    icon: 'ChatCircle',
    prompt: `Create detailed discussion notes from the following meeting transcript.

TRANSCRIPT:
{{transcript}}

Organize the notes by topic/theme. For each topic:

### [Topic Name]
- **Discussion**: What was discussed and by whom
- **Key Arguments**: Different perspectives presented
- **Conclusion**: What was agreed or decided
- **Open Questions**: Any unresolved issues

## Overall Conclusions
Summarize the main conclusions from the meeting.

## Next Steps
List concrete next steps with responsible parties.

Format in clean markdown.`,
  },

  {
    id: 'medical_soap',
    name: 'SOAP Notes',
    description: 'Subjective, Objective, Assessment, Plan format',
    category: 'medical',
    icon: 'Stethoscope',
    prompt: `Convert the following transcript into SOAP notes format.

TRANSCRIPT:
{{transcript}}

# SOAP Notes

## S — Subjective
Document the patient's reported symptoms, complaints, and history as described in the conversation. Include:
- Chief complaint
- History of present illness
- Relevant past medical history mentioned
- Patient's own description of symptoms

## O — Objective
Document any objective findings, measurements, or observations mentioned:
- Vital signs (if mentioned)
- Physical examination findings
- Test results or lab values
- Observable symptoms

## A — Assessment
Provide clinical assessment based on the discussion:
- Working diagnosis or differential diagnoses mentioned
- Clinical reasoning discussed
- Severity assessment

## P — Plan
Document the treatment plan discussed:
- Medications prescribed or adjusted
- Follow-up appointments
- Referrals
- Patient education or instructions
- Diagnostic tests ordered

Format in clean markdown.`,
  },
  {
    id: 'medical_progress',
    name: 'Progress Notes',
    description: 'Patient progress documentation and treatment updates',
    category: 'medical',
    icon: 'TrendUp',
    prompt: `Create clinical progress notes from the following transcript.

TRANSCRIPT:
{{transcript}}

# Progress Notes

**Date**: [Extract from context]
**Patient**: [If mentioned]
**Provider**: [If mentioned]

## Current Status
Summary of patient's current condition and progress since last visit.

## Changes Since Last Visit
- Symptom improvements
- New concerns
- Medication changes or responses

## Treatment Response
How the patient is responding to current treatment plan.

## Updated Plan
Any modifications to the treatment plan, new orders, or adjustments.

## Follow-up
Next appointment, pending tests, or monitoring requirements.

Format in clean markdown. Use clinical but clear language.`,
  },
  {
    id: 'medical_consultation',
    name: 'Consultation Notes',
    description: 'Specialist consultation documentation',
    category: 'medical',
    icon: 'UserCircle',
    prompt: `Create consultation notes from the following transcript.

TRANSCRIPT:
{{transcript}}

# Consultation Notes

**Referring Provider**: [If mentioned]
**Consulting Provider**: [If mentioned]
**Reason for Consultation**: [Extract from discussion]

## Clinical History
Relevant history as discussed during the consultation.

## Findings
Key findings from the consultation, examination, or review.

## Assessment & Recommendations
- Clinical assessment
- Recommended interventions
- Diagnostic suggestions

## Communication
What was communicated back to the referring provider or patient.

Format in clean markdown.`,
  },

  {
    id: 'interview_job',
    name: 'Job Interview Assessment',
    description: 'Candidate evaluation with skills and cultural fit',
    category: 'interview',
    icon: 'UserCheck',
    prompt: `Create a job interview assessment from the following transcript.

TRANSCRIPT:
{{transcript}}

# Interview Assessment

## Candidate Overview
Brief summary of the candidate's background and presentation.

## Technical Skills
| Skill | Evidence | Rating |
|-------|----------|--------|
| ... | ... | Strong/Adequate/Needs Development |

## Experience Highlights
Key experiences and achievements discussed.

## Behavioral Indicators
Notable behavioral examples from the interview (communication, problem-solving, teamwork).

## Cultural Fit
Assessment of alignment with team/company values based on responses.

## Strengths
Top strengths demonstrated during the interview.

## Areas of Concern
Any gaps or concerns identified.

## Overall Impression
Summary recommendation.

Format in clean markdown.`,
  },
  {
    id: 'interview_journalist',
    name: 'Journalist Interview',
    description: 'Interview transcript organized by topics and quotes',
    category: 'interview',
    icon: 'Newspaper',
    prompt: `Organize the following interview transcript for journalistic purposes.

TRANSCRIPT:
{{transcript}}

# Interview Notes

## Subject
Who was interviewed and their role/background.

## Key Topics
Organize the interview by major topics discussed.

### [Topic 1]
- Summary of what was said
- **Key Quote**: "Direct quote from the interview"
- Context and significance

### [Topic 2]
(repeat pattern)

## Notable Quotes
List the most impactful, quotable statements with attribution.

## Background Information
Any factual claims or data points mentioned that may need verification.

## Story Angles
Potential story angles that emerge from this interview.

Format in clean markdown.`,
  },

  {
    id: 'education_lecture',
    name: 'Lecture Notes',
    description: 'Structured notes from a lecture or presentation',
    category: 'education',
    icon: 'Chalkboard',
    prompt: `Create structured lecture notes from the following transcript.

TRANSCRIPT:
{{transcript}}

# Lecture Notes

## Topic
Main subject of the lecture.

## Key Concepts
Explain each major concept covered:
### [Concept 1]
- Definition or explanation
- Key details
- Examples given

### [Concept 2]
(repeat pattern)

## Important Definitions
List any terms defined during the lecture.

## Examples & Case Studies
Examples or case studies discussed.

## Connections
How topics connect to each other or to previous material.

## Study Points
Key points likely to appear on exams or that require further study.

## Questions Raised
Any unanswered questions or topics for further exploration.

Format in clean markdown.`,
  },
  {
    id: 'education_class',
    name: 'Class Summary',
    description: 'Key learnings and revision notes from a class',
    category: 'education',
    icon: 'BookOpen',
    prompt: `Create a class summary for revision from the following transcript.

TRANSCRIPT:
{{transcript}}

# Class Summary

## Today's Topic
Brief description of what the class covered.

## Key Learnings
1. [Main point 1] — Brief explanation
2. [Main point 2] — Brief explanation
3. (continue as needed)

## Important Facts & Figures
Bullet list of specific data, dates, formulas, or facts mentioned.

## Practical Applications
How the material applies in practice.

## Homework / Assignments
Any tasks or readings assigned.

## Review Questions
3-5 questions to test understanding of the material.

Keep it concise and study-friendly. Format in clean markdown.`,
  },

  {
    id: 'business_bant',
    name: 'BANT Tracking',
    description: 'Budget, Authority, Need, Timeline for sales calls',
    category: 'business',
    icon: 'Target',
    prompt: `Analyze the following sales conversation using the BANT framework.

TRANSCRIPT:
{{transcript}}

# BANT Analysis

## Budget
- **Status**: Identified / Not Identified / Partially Identified
- **Details**: What budget information was shared?
- **Signals**: Any pricing discussions or budget constraints mentioned

## Authority
- **Decision Maker**: Who has the authority to make the purchase decision?
- **Influencers**: Other stakeholders mentioned
- **Process**: What is their decision-making process?

## Need
- **Pain Points**: What problems are they trying to solve?
- **Current Solution**: What are they using now?
- **Requirements**: Specific features or capabilities needed
- **Urgency Level**: How urgent is this need?

## Timeline
- **Expected Timeline**: When do they want to implement?
- **Key Dates**: Any deadlines or milestones mentioned
- **Blockers**: What could delay the decision?

## Next Steps
Recommended follow-up actions based on the BANT analysis.

## Deal Score
Overall assessment of deal viability: Hot / Warm / Cold

Format in clean markdown.`,
  },
  {
    id: 'business_client_update',
    name: 'Client Update',
    description: 'Client meeting summary with status and deliverables',
    category: 'business',
    icon: 'Handshake',
    prompt: `Create a client update summary from the following meeting transcript.

TRANSCRIPT:
{{transcript}}

# Client Update

## Project Status
Current state of the project/engagement.

## Discussion Topics
Summary of each topic discussed during the meeting.

## Client Feedback
Key feedback or concerns raised by the client.

## Deliverables Status
| Deliverable | Status | Notes |
|-------------|--------|-------|
| ... | On Track / At Risk / Delayed | ... |

## Issues & Risks
Any issues raised or risks identified.

## Agreed Actions
| Action | Owner | Due Date |
|--------|-------|----------|
| ... | ... | ... |

## Next Meeting
When and what will be covered next.

Format in clean markdown.`,
  },
  {
    id: 'business_consultant',
    name: 'Consultant Report',
    description: 'Professional advisory report from consultations',
    category: 'business',
    icon: 'ChartLine',
    prompt: `Create a consultant advisory report from the following transcript.

TRANSCRIPT:
{{transcript}}

# Advisory Report

## Executive Summary
Brief overview of the consultation and key findings.

## Current Situation
Analysis of the client's current state as discussed.

## Key Findings
Detailed findings from the consultation:
1. [Finding 1] — Impact and implications
2. [Finding 2] — Impact and implications

## Recommendations
Prioritized recommendations:
### High Priority
- Recommendation with rationale

### Medium Priority
- Recommendation with rationale

### Long-term
- Strategic recommendation

## Implementation Roadmap
Suggested steps for implementing recommendations.

## Risks & Considerations
Potential risks and mitigation strategies discussed.

## Metrics for Success
How to measure whether the recommendations are working.

Format in clean markdown.`,
  },
];

export function getTemplateById(id: string): SummaryTemplate | undefined {
  return SUMMARY_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: TemplateCategory): SummaryTemplate[] {
  return SUMMARY_TEMPLATES.filter(t => t.category === category);
}
