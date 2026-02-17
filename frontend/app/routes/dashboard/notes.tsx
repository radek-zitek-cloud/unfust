import { useCallback, useEffect, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import {
  ActionIcon,
  Center,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  type Note,
  getNotes,
  createNote,
  updateNote,
  updateNotePosition,
  bringNoteToFront,
  deleteNote,
} from "~/lib/api";
import { NoteCard } from "~/components/notes/NoteCard";
import { PASTEL_COLORS } from "~/components/notes/ColorPicker";
import classes from "./notes.module.css";

const ResponsiveGrid = WidthProvider(Responsive);

interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function IconPlus({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconNotes({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Load notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const data = await getNotes();
        setNotes(data);
      } catch {
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };
    loadNotes();
  }, []);

  // Convert notes to grid layout
  const gridLayout = notes.map((note) => ({
    i: note.id,
    x: note.x,
    y: note.y,
    w: note.w,
    h: note.h,
    minW: 2,
    minH: 2,
  }));

  // Handle layout change (drag/resize)
  const handleLayoutChange = useCallback(
    (layout: readonly GridItem[]) => {
      // Update local state immediately
      const updated = notes.map((note) => {
        const item = layout.find((l) => l.i === note.id);
        if (item) {
          return { ...note, x: item.x, y: item.y, w: item.w, h: item.h };
        }
        return note;
      });
      setNotes(updated);

      // Save positions to server (debounced in real implementation)
      layout.forEach(async (item) => {
        const note = notes.find((n) => n.id === item.i);
        if (
          note &&
          (note.x !== item.x ||
            note.y !== item.y ||
            note.w !== item.w ||
            note.h !== item.h)
        ) {
          try {
            await updateNotePosition(item.i, item.x, item.y, item.w, item.h);
          } catch {
            // Silent fail - position will sync on next load
          }
        }
      });
    },
    [notes]
  );

  // Add new note
  const handleAddNote = useCallback(async () => {
    try {
      const newNote = await createNote({
        title: "",
        content: "",
        color: PASTEL_COLORS[0].hex,
      });
      setNotes((prev) => [...prev, newNote]);
    } catch {
      // Error handling
    }
  }, []);

  // Update note (content/title/color)
  const handleUpdateNote = useCallback(
    async (id: string, data: Partial<Note>) => {
      // Optimistic update
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? { ...note, ...data } : note))
      );

      setSavingId(id);
      try {
        await updateNote(id, data);
      } finally {
        setTimeout(() => setSavingId((current) => (current === id ? null : current)), 1000);
      }
    },
    []
  );

  // Delete note
  const handleDeleteNote = useCallback(async (id: string) => {
    // Optimistic update
    setNotes((prev) => prev.filter((note) => note.id !== id));
    try {
      await deleteNote(id);
    } catch {
      // Rollback would happen here if needed
    }
  }, []);

  // Bring note to front (z-index)
  const handleFocusNote = useCallback(async (id: string) => {
    try {
      const updated = await bringNoteToFront(id);
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? updated : note))
      );
    } catch {
      // Silent fail
    }
  }, []);

  if (loading) {
    return (
      <Center h={300}>
        <Text>Loading notes...</Text>
      </Center>
    );
  }

  return (
    <div className={classes.container}>
      {notes.length === 0 ? (
        <Center h={400}>
          <Stack align="center" gap="md">
            <IconNotes size={64} />
            <Title order={3} c="dimmed">
              No notes yet
            </Title>
            <Text c="dimmed" size="sm">
              Click the + button to create your first note
            </Text>
          </Stack>
        </Center>
      ) : (
        <ResponsiveGrid
          layouts={{ lg: gridLayout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 8, md: 6, sm: 4, xs: 2, xxs: 2 }}
          rowHeight={90}
          margin={[10, 10]}
          containerPadding={[10, 10]}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".note-drag-handle"
          style={{ margin: -10 }}
        >
          {notes.map((note) => (
            <div key={note.id}>
              <NoteCard
                note={note}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
                onFocus={handleFocusNote}
                isSaving={savingId === note.id}
                dragHandleProps={{ className: "note-drag-handle" }}
              />
            </div>
          ))}
        </ResponsiveGrid>
      )}

      {/* Floating Action Button */}
      <Tooltip label="Add note" position="left">
        <ActionIcon
          className={classes.fab}
          size="xl"
          radius="xl"
          variant="filled"
          onClick={handleAddNote}
        >
          <IconPlus size={24} />
        </ActionIcon>
      </Tooltip>
    </div>
  );
}
