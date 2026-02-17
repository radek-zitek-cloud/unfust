import { useCallback, useEffect, useRef, useState } from "react";
import {
  Paper,
  TextInput,
  Group,
  ActionIcon,
  Text,
  Tooltip,
} from "@mantine/core";
import type { Note } from "~/lib/api";
import { WysiwygEditor } from "./WysiwygEditor";
import { ColorPicker } from "./ColorPicker";
import classes from "./NoteCard.module.css";

function IconGripVertical({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  );
}

function IconTrash({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconCheck({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface NoteCardProps {
  note: Note;
  onUpdate: (id: string, data: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onFocus: (id: string) => void;
  isSaving?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function NoteCard({
  note,
  onUpdate,
  onDelete,
  onFocus,
  isSaving,
  dragHandleProps,
}: NoteCardProps) {
  const [localTitle, setLocalTitle] = useState(note.title);
  const [localContent, setLocalContent] = useState(note.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  // Update local state when note prop changes (e.g., from parent)
  useEffect(() => {
    if (isMountedRef.current) {
      setLocalTitle(note.title);
      setLocalContent(note.content);
    }
    isMountedRef.current = true;
  }, [note.id, note.title, note.content]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        if (isEditing && isDirty) {
          // Save on exit if dirty
          onUpdate(note.id, { title: localTitle, content: localContent });
        }
        setIsEditing(false);
        setIsDirty(false);
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, isDirty, note.id, onUpdate, localTitle, localContent]);

  // Debounced save
  const scheduleSave = useCallback(
    (title: string, content: string) => {
      setIsDirty(true);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onUpdate(note.id, { title, content });
        setIsDirty(false);
      }, 500);
    },
    [note.id, onUpdate]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setLocalTitle(newTitle);
      scheduleSave(newTitle, localContent);
    },
    [localContent, scheduleSave]
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      setLocalContent(newContent);
      scheduleSave(localTitle, newContent);
    },
    [localTitle, scheduleSave]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      onUpdate(note.id, { color });
    },
    [note.id, onUpdate]
  );

  const handleDelete = useCallback(() => {
    onDelete(note.id);
  }, [note.id, onDelete]);

  const handleFocus = useCallback(() => {
    onFocus(note.id);
    setIsEditing(true);
  }, [note.id, onFocus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Format relative time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Paper
      ref={cardRef}
      className={classes.card}
      style={{ backgroundColor: note.color }}
      onMouseDown={handleFocus}
      shadow="sm"
      radius="md"
    >
      {/* Header */}
      <div className={classes.header}>
        <Group gap="xs">
          <div {...dragHandleProps} className={classes.dragHandle}>
            <IconGripVertical size={18} />
          </div>
          <TextInput
            className={classes.titleInput}
            classNames={{ input: classes.titleInputInner }}
            placeholder="Note title"
            value={localTitle}
            onChange={handleTitleChange}
            variant="unstyled"
            size="sm"
            fw={600}
            onFocus={() => setIsEditing(true)}
          />
        </Group>
        <Group gap={4}>
          <ColorPicker value={note.color} onChange={handleColorChange} />
          <Tooltip label="Delete note">
            <ActionIcon
              variant="subtle"
              size="sm"
              color="red"
              onClick={handleDelete}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>

      {/* Content */}
      <div className={`${classes.content} ${isEditing ? classes.contentEditing : ""}`}>
        <WysiwygEditor
          value={localContent}
          onChange={handleContentChange}
          placeholder="Start typing..."
          minHeight={isEditing ? 80 : undefined}
          isEditing={isEditing}
        />
      </div>

      {/* Footer */}
      <div className={classes.footer}>
        <Group gap="xs" justify="space-between">
          <Text size="xs" c="dimmed">
            {formatTime(note.updated_at)}
          </Text>
          {isEditing && isSaving && (
            <Text size="xs" c="dimmed">
              Saving...
            </Text>
          )}
          {isEditing && !isSaving && !isDirty && (
            <Group gap={4}>
              <IconCheck size={12} />
              <Text size="xs" c="dimmed">
                Saved
              </Text>
            </Group>
          )}
        </Group>
      </div>
    </Paper>
  );
}
