export interface NoteTemplate {
  id: string;
  label: string;
  title: string;
  content: string;
}

function doc(...nodes: object[]) {
  return JSON.stringify({ type: "doc", content: nodes });
}

function h2(text: string) {
  return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] };
}

function p() {
  return { type: "paragraph", content: [] };
}

function bulletList(...items: object[]) {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [item],
    })),
  };
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "meeting",
    label: "Meeting Notes",
    title: "Meeting Notes",
    content: doc(
      h2("Attendees"), p(),
      h2("Agenda"), p(),
      h2("Discussion"), p(),
      h2("Action Items"), p()
    ),
  },
  {
    id: "journal",
    label: "Daily Journal",
    title: `Journal — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    content: doc(
      h2("How I'm feeling"), p(),
      h2("Today"), p(),
      h2("Gratitude"), p()
    ),
  },
  {
    id: "todo",
    label: "Todo List",
    title: "Todo List",
    content: doc(
      h2("Tasks"),
      bulletList(p(), p(), p())
    ),
  },
  {
    id: "project",
    label: "Project Brief",
    title: "Project Brief",
    content: doc(
      h2("Overview"), p(),
      h2("Goals"), p(),
      h2("Timeline"), p(),
      h2("Notes"), p()
    ),
  },
];
