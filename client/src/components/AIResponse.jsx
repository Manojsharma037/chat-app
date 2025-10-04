import React from "react";
import ReactMarkdown from "react-markdown";

export default function AIResponse({ aiReply }) {
  return <ReactMarkdown>{aiReply}</ReactMarkdown>;
}
