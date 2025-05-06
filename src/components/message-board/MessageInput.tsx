
import React from "react";
import { MessageCategory } from "@/types/reactions";
import MessageInputForm from "./message-input";

interface MessageInputProps {
  onSend: (content: string, category: MessageCategory) => Promise<void>;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend }) => {
  return <MessageInputForm onSend={onSend} />;
};

export default MessageInput;
