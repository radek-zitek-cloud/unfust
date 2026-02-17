import { useCallback, useEffect, useRef, useState } from "react";
import { Group, ActionIcon, Divider, Box } from "@mantine/core";
import classes from "./WysiwygEditor.module.css";

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  isEditing?: boolean;
}

function IconBold({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  );
}

function IconItalic({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  );
}

function IconCode({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconLink({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconList({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function IconListNumbers({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
  );
}

export function WysiwygEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  minHeight,
  isEditing = false,
}: WysiwygEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(!value || value === "<br>");

  // Sync external value to editor (only when not editing to avoid cursor jumps)
  useEffect(() => {
    if (editorRef.current && !isEditing && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      setIsEmpty(!value || value === "" || value === "<br>");
    }
  }, [value, isEditing]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const empty = html === "" || html === "<br>";
      setIsEmpty(empty);
      onChange(html);
    }
  }, [onChange]);

  const execCommand = useCallback(
    (command: string, valueArg: string | undefined = undefined) => {
      document.execCommand(command, false, valueArg);
      handleInput();
      editorRef.current?.focus();
    },
    [handleInput]
  );

  const handleBold = () => execCommand("bold");
  const handleItalic = () => execCommand("italic");
  const handleCode = () => execCommand("formatBlock", "PRE");
  const handleLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      execCommand("createLink", url);
    }
  };
  const handleBulletList = () => execCommand("insertUnorderedList");
  const handleNumberedList = () => execCommand("insertOrderedList");

  return (
    <Box className={`${classes.wrapper} ${isEditing ? classes.editing : ""}`}>
      {isEditing && (
        <Group gap="xs" className={classes.toolbar}>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleBold}
            title="Bold"
            aria-label="Bold"
          >
            <IconBold size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleItalic}
            title="Italic"
            aria-label="Italic"
          >
            <IconItalic size={16} />
          </ActionIcon>
          <Divider orientation="vertical" />
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleCode}
            title="Code"
            aria-label="Code"
          >
            <IconCode size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleLink}
            title="Link"
            aria-label="Link"
          >
            <IconLink size={16} />
          </ActionIcon>
          <Divider orientation="vertical" />
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleBulletList}
            title="Bullet list"
            aria-label="Bullet list"
          >
            <IconList size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleNumberedList}
            title="Numbered list"
            aria-label="Numbered list"
          >
            <IconListNumbers size={16} />
          </ActionIcon>
        </Group>
      )}

      <div className={classes.editorWrapper}>
        <div
          ref={editorRef}
          className={`${classes.editor} ${isEditing ? classes.editorEditing : ""}`}
          contentEditable
          onInput={handleInput}
          style={{ minHeight }}
          suppressContentEditableWarning
        />
        {isEmpty && (
          <div className={classes.placeholder}>{placeholder}</div>
        )}
      </div>
    </Box>
  );
}
