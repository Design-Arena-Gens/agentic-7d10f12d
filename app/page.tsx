'use client'

import { useState } from 'react'

interface Message {
  timestamp: string
  sender: string
  message: string
  date: string
  time: string
}

interface ParsedData {
  groupName: string
  messages: Message[]
  participants: string[]
  messageCount: number
  dateRange: {
    start: string
    end: string
  }
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSender, setSelectedSender] = useState<string>('all')

  const parseWhatsAppChat = (text: string): ParsedData | null => {
    const lines = text.split('\n')
    const messages: Message[] = []
    const participantsSet = new Set<string>()

    // Support multiple date formats
    const patterns = [
      // Format: [DD/MM/YYYY, HH:MM:SS] Sender: Message
      /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.*)$/i,
      // Format: DD/MM/YYYY, HH:MM - Sender: Message
      /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*-\s*([^:]+):\s*(.*)$/i,
      // Format: DD/MM/YY, HH:MM - Sender: Message
      /^(\d{1,2}\/\d{1,2}\/\d{2}),\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*-\s*([^:]+):\s*(.*)$/i,
      // Format: M/D/YY, H:MM AM/PM - Sender: Message
      /^(\d{1,2}\/\d{1,2}\/\d{2}),\s*(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*([^:]+):\s*(.*)$/i,
    ]

    let currentMessage: Message | null = null

    for (const line of lines) {
      if (!line.trim()) continue

      let matched = false

      for (const pattern of patterns) {
        const match = line.match(pattern)
        if (match) {
          if (currentMessage) {
            messages.push(currentMessage)
          }

          const [, date, time, sender, message] = match
          const trimmedSender = sender.trim()

          participantsSet.add(trimmedSender)

          currentMessage = {
            timestamp: `${date}, ${time}`,
            date: date,
            time: time,
            sender: trimmedSender,
            message: message.trim()
          }

          matched = true
          break
        }
      }

      if (!matched && currentMessage) {
        // Continuation of previous message
        currentMessage.message += '\n' + line
      }
    }

    if (currentMessage) {
      messages.push(currentMessage)
    }

    if (messages.length === 0) {
      return null
    }

    const dates = messages.map(m => new Date(m.date.split('/').reverse().join('-')))
    const validDates = dates.filter(d => !isNaN(d.getTime()))

    return {
      groupName: 'Zero to One',
      messages,
      participants: Array.from(participantsSet).sort(),
      messageCount: messages.length,
      dateRange: {
        start: validDates.length > 0 ? messages[0].date : 'N/A',
        end: validDates.length > 0 ? messages[messages.length - 1].date : 'N/A'
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setError('')
    setLoading(true)

    try {
      const text = await uploadedFile.text()
      const parsed = parseWhatsAppChat(text)

      if (!parsed || parsed.messages.length === 0) {
        setError('Could not parse WhatsApp chat. Please ensure you uploaded a valid WhatsApp chat export (.txt file).')
        setParsedData(null)
      } else {
        setParsedData(parsed)
      }
    } catch (err) {
      setError('Error reading file. Please try again.')
      setParsedData(null)
    } finally {
      setLoading(false)
    }
  }

  const filteredMessages = parsedData?.messages.filter(msg => {
    const matchesSearch = msg.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         msg.sender.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSender = selectedSender === 'all' || msg.sender === selectedSender
    return matchesSearch && matchesSender
  }) || []

  const downloadJSON = () => {
    if (!parsedData) return
    const dataStr = JSON.stringify(parsedData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = 'whatsapp_chat_export.json'
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const downloadCSV = () => {
    if (!parsedData) return
    const csvContent = [
      ['Date', 'Time', 'Sender', 'Message'].join(','),
      ...parsedData.messages.map(msg =>
        [msg.date, msg.time, msg.sender, `"${msg.message.replace(/"/g, '""')}"`].join(',')
      )
    ].join('\n')

    const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csvContent)
    const exportFileDefaultName = 'whatsapp_chat_export.csv'
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📱 WhatsApp Chat Extractor
          </h1>
          <p className="text-gray-600">Extract and analyze conversations from "Zero to One" group</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col items-center">
            <label className="w-full max-w-md">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all">
                <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600 text-center mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-500">WhatsApp chat export (.txt file)</p>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </label>
            {file && (
              <p className="mt-4 text-sm text-gray-600">
                Selected: <span className="font-semibold">{file.name}</span>
              </p>
            )}
          </div>

          {loading && (
            <div className="text-center mt-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              <p className="text-gray-600 mt-2">Parsing chat...</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {parsedData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Messages</div>
                <div className="text-3xl font-bold text-green-600">{parsedData.messageCount}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Participants</div>
                <div className="text-3xl font-bold text-blue-600">{parsedData.participants.length}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Start Date</div>
                <div className="text-xl font-bold text-gray-800">{parsedData.dateRange.start}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">End Date</div>
                <div className="text-xl font-bold text-gray-800">{parsedData.dateRange.end}</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Search messages or senders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  value={selectedSender}
                  onChange={(e) => setSelectedSender(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Senders</option>
                  {parsedData.participants.map(participant => (
                    <option key={participant} value={participant}>{participant}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={downloadJSON}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Download JSON
                </button>
                <button
                  onClick={downloadCSV}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Download CSV
                </button>
              </div>

              <div className="text-sm text-gray-600 mb-4">
                Showing {filteredMessages.length} of {parsedData.messageCount} messages
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredMessages.map((msg, idx) => (
                  <div key={idx} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-green-700">{msg.sender}</span>
                      <span className="text-xs text-gray-500">{msg.timestamp}</span>
                    </div>
                    <div className="text-gray-800 whitespace-pre-wrap">{msg.message}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Participants</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {parsedData.participants.map(participant => {
                  const count = parsedData.messages.filter(m => m.sender === participant).length
                  return (
                    <div key={participant} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="font-semibold text-gray-800">{participant}</div>
                      <div className="text-sm text-gray-600">{count} messages</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How to export WhatsApp chat:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>Open WhatsApp and go to the "Zero to One" group</li>
            <li>Tap the group name at the top</li>
            <li>Scroll down and tap "Export Chat"</li>
            <li>Choose "Without Media"</li>
            <li>Save the .txt file and upload it here</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
