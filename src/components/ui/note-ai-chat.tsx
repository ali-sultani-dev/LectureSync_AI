'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Bot, User, Loader2, Trash2, Menu, X } from 'lucide-react'
// import { cn } from '@/lib/utils'
import {
  getAIResponseForNote,
  createNoteChat,
  updateNoteChat,
  loadNoteChats,
} from '@/actions/ChatActions'
import { format } from 'date-fns'

interface Message {
  id?: string | null
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface Chat {
  id: number
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  noteId: number
}

interface NoteAIChatProps {
  noteId: number
  noteTitle: string
}

export function NoteAIChat({ noteId, noteTitle }: NoteAIChatProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatHistories, setChatHistories] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Load chat history for this note on mount
  useEffect(() => {
    loadInitialData()
  }, [noteId])

  const loadInitialData = async () => {
    try {
      const chatsData = await loadNoteChats(noteId)
      setChatHistories(chatsData as Chat[])

      // Load the most recent chat if available
      if (chatsData.length > 0) {
        const recentChat = chatsData[0]
        setCurrentChatId(recentChat.id)
        setMessages(recentChat.messages || [])
      }
    } catch (error) {
      console.error('Failed to load chat data:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const messageContent = input.trim()
    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    }

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Get AI response using server action for this specific note
      const aiResponse = await getAIResponseForNote(noteId, messageContent)

      const aiMessage: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      }

      // Add AI message
      setMessages((prev) => [...prev, aiMessage])

      // Save to database
      const newMessages = [...messages, userMessage, aiMessage]

      if (currentChatId) {
        // Update existing chat
        await updateNoteChat(currentChatId, newMessages)
      } else {
        // Create new chat
        const chatTitle = `Chat about "${noteTitle}"`
        const newChat = await createNoteChat(noteId, chatTitle, newMessages)
        setCurrentChatId(newChat.id)
      }

      // Refresh chat list
      const updatedChats = await loadNoteChats(noteId)
      setChatHistories(updatedChats as Chat[])
    } catch (error) {
      console.error('Failed to send message:', error)

      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error. Please try again.`,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const loadChatHistory = (chat: Chat) => {
    setMessages(chat.messages)
    setCurrentChatId(chat.id)
    setSidebarOpen(false)
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentChatId(null)
    setSidebarOpen(false)
  }

  const deleteChatHistory = (chatId: number) => {
    setChatHistories((prev) => prev.filter((chat) => chat.id !== chatId))
    if (currentChatId === chatId) {
      startNewChat()
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="flex h-full relative max-h-full overflow-hidden rounded-lg">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 bg-background bg-opacity-70 z-40 md:hidden transition-opacity duration-300 rounded-lg"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Chat History */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } absolute md:relative z-50 md:z-auto h-full transition-all duration-300 ease-in-out border-r bg-muted/30 flex flex-col overflow-hidden ${
          sidebarOpen ? 'w-80 rounded-l-lg' : 'w-0 md:w-0 border-r-0'
        }`}
        style={{
          width: sidebarOpen ? '320px' : '0px',
        }}
      >
        <div
          className={`w-80 h-full flex flex-col ${!sidebarOpen ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 overflow-hidden rounded-l-lg`}
        >
          {/* Mobile Close Button */}
          <div className="md:hidden absolute top-4 right-4 z-10">
            <Button
              onClick={() => setSidebarOpen(false)}
              variant="ghost"
              size="icon"
              className="bg-muted hover:bg-muted/80"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4 border-b flex-shrink-0 rounded-tl-lg bg-muted/30">
            <h3 className="text-lg font-semibold pr-12 md:pr-0">Chat History</h3>
          </div>

          <div className="p-3 flex-shrink-0 bg-muted/30">
            <Button onClick={startNewChat} className="w-full justify-start" variant="outline">
              <Bot className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          <ScrollArea className="flex-1 px-3 bg-muted/30">
            <div className="space-y-2 pb-4">
              {chatHistories.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    currentChatId === chat.id ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => loadChatHistory(chat)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-tight break-words">{chat.title}</p>
                    <p className="text-xs text-muted-foreground break-words">
                      {format(new Date(chat.createdAt), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-accent flex-shrink-0 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteChatHistory(chat.id)
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out bg-background min-h-0 overflow-hidden ${
          sidebarOpen ? 'rounded-r-lg' : 'rounded-lg'
        }`}
      >
        {/* Messages */}
        <ScrollArea className="flex-1 p-3 sm:p-4 bg-background min-h-0 overflow-hidden">
          <div className="space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground mt-4 sm:mt-8">
                <Bot className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-primary/50" />
                <p className="text-lg sm:text-xl font-medium">How can I help you with this note?</p>
                <p className="text-sm px-4 text-muted-foreground">
                  Ask me anything and I'll do my best to assist you.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}-${message.timestamp}`}
                  className={`flex items-start space-x-2 sm:space-x-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
                      <AvatarFallback className="bg-muted">
                        <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                      message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <User className="w-3 h-3 sm:w-4 sm:h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-start space-x-2 sm:space-x-3">
                <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
                  <AvatarFallback className="bg-muted">
                    <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl px-3 sm:px-4 py-2 sm:py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Form */}
        <div
          className={`p-3 sm:p-4 border-t flex-shrink-0 bg-background ${
            sidebarOpen ? 'rounded-br-lg' : 'rounded-b-lg'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Button
              onClick={toggleSidebar}
              variant="ghost"
              size="icon"
              className="flex-shrink-0 transition-all duration-200 hover:bg-muted"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <form onSubmit={handleSubmit} className="flex space-x-2 flex-1">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask anything about this note..."
                disabled={isLoading}
                className="flex-1 text-sm sm:text-base h-10 bg-background"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-200 h-10 w-10 sm:h-10 sm:w-10 flex-shrink-0 rounded-lg"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
