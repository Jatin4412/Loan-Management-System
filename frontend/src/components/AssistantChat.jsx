import React, { useEffect, useRef, useState } from "react";
import {
  FiActivity,
  FiBarChart2,
  FiMessageCircle,
  FiSend,
  FiTrash2,
  FiX
} from "react-icons/fi";
import "./AssistantChat.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I'm your SmarterLoans AI assistant. I can help analyze portfolio performance, collection trends, overdue exposure and loan distribution using aggregate, non-identifying data."
};

const suggestions = [
  { label: "Analyze portfolio", icon: FiBarChart2, prompt: "Analyze the current loan portfolio and highlight the key metrics." },
  { label: "Collection trends", icon: FiTrendingIcon, prompt: "Review the monthly collection trend and explain what stands out." },
  { label: "Overdue overview", icon: FiActivity, prompt: "Summarize the current overdue exposure and what it means operationally." },
  { label: "Loan distribution", icon: FiBarChart2, prompt: "Analyze the loan type distribution and status mix." }
];

function FiTrendingIcon(props) {
  return <FiActivity {...props} />;
}

function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|__[^_]+__|\x60[^\x60]+\x60)/g);
  const tick = String.fromCharCode(96);

  return parts.map((part, index) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith(tick) && part.endsWith(tick)) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    return part;
  });
}

function isTableRow(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|");
}

function getTableCells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
}

function isTableDivider(line) {
  return isTableRow(line) && getTableCells(line).every(cell => /^:?-{3,}:?$/.test(cell));
}

function isBlockStart(lines, index) {
  const line = lines[index].trim();
  return !line ||
    /^#{1,3}\s+/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    isTableRow(line);
}

function AssistantMessage({ content }) {
  const lines = String(content || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (isTableRow(line)) {
      const tableLines = [];

      while (index < lines.length && isTableRow(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }

      const hasDivider = tableLines.length > 1 && isTableDivider(tableLines[1]);
      const header = getTableCells(tableLines[0]);
      const body = tableLines.slice(hasDivider ? 2 : 1).map(getTableCells);

      blocks.push(
        <div className="assistant-chat-table-wrap" key={"table-" + index}>
          <table className="assistant-chat-table">
            <thead>
              <tr>{header.map((cell, cellIndex) => <th key={cellIndex}>{renderInline(cell)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {header.map((_, cellIndex) => (
                    <td key={cellIndex}>{renderInline(row[cellIndex] || "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      const level = heading[1].length;
      const HeadingTag = level === 1 ? "h3" : level === 2 ? "h4" : "h5";
      blocks.push(<HeadingTag key={"heading-" + index}>{renderInline(heading[2])}</HeadingTag>);
      index += 1;
      continue;
    }

    const listMatch = line.match(/^([-*]|\d+\.)\s+(.+)$/);

    if (listMatch) {
      const ordered = /^\d+\./.test(listMatch[1]);
      const ListTag = ordered ? "ol" : "ul";
      const items = [];

      while (index < lines.length) {
        const itemMatch = lines[index].trim().match(/^([-*]|\d+\.)\s+(.+)$/);

        if (!itemMatch || /^\d+\./.test(itemMatch[1]) !== ordered) {
          break;
        }

        items.push(itemMatch[2]);
        index += 1;
      }

      blocks.push(
        <ListTag key={"list-" + index}>
          {items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}
        </ListTag>
      );
      continue;
    }

    const paragraph = [];

    while (index < lines.length && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    if (paragraph.length) {
      blocks.push(<p key={"paragraph-" + index}>{renderInline(paragraph.join(" "))}</p>);
    }
  }

  return <div className="assistant-chat-markdown">{blocks}</div>;
}

export default function AssistantChat({ currentView }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const composerRef = useRef(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;

    const maxHeight = 80;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [draft]);

  const sendMessage = async (value) => {
    const content = String(value === undefined ? draft : value).trim();
    if (!content || isLoading) return;

    const history = messages
      .filter(item => item.role === "user" || item.role === "assistant")
      .slice(-8)
      .map(item => ({ role: item.role, content: item.content }));

    const userMessage = {
      id: Date.now() + "-user",
      role: "user",
      content
    };

    setMessages(previous => [...previous, userMessage]);
    setDraft("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_BASE_URL + "/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {})
        },
        body: JSON.stringify({
          message: content,
          history,
          pageContext: { view: currentView }
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || "The assistant could not respond. Please try again.");
      }

      setMessages(previous => [
        ...previous,
        {
          id: Date.now() + "-assistant",
          role: "assistant",
          content: data.reply
        }
      ]);
    } catch (error) {
      setMessages(previous => [
        ...previous,
        {
          id: Date.now() + "-error",
          role: "assistant",
          content: error.message || "Something went wrong. Please try again.",
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([welcomeMessage]);
    setDraft("");
  };

  return (
    <div className="assistant-chat-root">
      {isOpen && (
        <section className="assistant-chat-panel" aria-label="SmarterLoans AI assistant">
          <header className="assistant-chat-header">
            <div className="assistant-chat-brand">
              <div className="assistant-chat-avatar">
                <FiActivity />
              </div>
              <div>
                <h3>SmarterLoans AI</h3>
                <span><i /> Portfolio intelligence</span>
              </div>
            </div>
            <div className="assistant-chat-header-actions">
              <button type="button" title="Clear conversation" onClick={clearConversation}>
                <FiTrash2 />
              </button>
              <button type="button" title="Close assistant" onClick={() => setIsOpen(false)}>
                <FiX />
              </button>
            </div>
          </header>

          <div className="assistant-chat-context">
            <span>Viewing: {currentView || "Workspace"}</span>
            <span>Aggregate data only</span>
          </div>

          <div className="assistant-chat-messages">
            {messages.map(item => (
              <div key={item.id} className={"assistant-chat-row " + (item.role === "user" ? "user" : "assistant")}>
                <div className={"assistant-chat-bubble " + (item.role === "user" ? "user" : "assistant") + (item.isError ? " error" : "")}>
                  {item.role === 'assistant' ? <AssistantMessage content={item.content} /> : item.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="assistant-chat-suggestions">
                <p>Try asking</p>
                {suggestions.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.label} type="button" onClick={() => sendMessage(item.prompt)}>
                      <Icon />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {isLoading && (
              <div className="assistant-chat-row assistant">
                <div className="assistant-chat-bubble assistant assistant-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="assistant-chat-composer" onSubmit={handleSubmit}>
            <textarea
              ref={composerRef}
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about portfolio trends..."
              rows={1}
              maxLength={2000}
              disabled={isLoading}
            />
            <button type="submit" disabled={!draft.trim() || isLoading} aria-label="Send message">
              <FiSend />
            </button>
          </form>
          <p className="assistant-chat-disclaimer">
            Aggregate analytics only. Do not enter names, phone numbers, PAN, Aadhaar or account details.
          </p>
        </section>
      )}

      <button
        type="button"
        className={"assistant-chat-launcher" + (isOpen ? " active" : "")}
        onClick={() => setIsOpen(previous => !previous)}
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
      >
        {isOpen ? <FiX /> : <FiMessageCircle />}
        {!isOpen && <span>AI Assistant</span>}
      </button>
    </div>
  );
}