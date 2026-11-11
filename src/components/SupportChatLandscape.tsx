import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Phone, 
  Clock, 
  Sparkles, 
  Check, 
  CheckCheck, 
  Store, 
  CalendarDays, 
  ChevronRight, 
  Search, 
  ShieldCheck, 
  HelpCircle, 
  Utensils, 
  AlertCircle,
  Minimize2,
  Maximize2,
  User
} from 'lucide-react';
import { Restaurant, Reservation } from '../types';

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'concierge' | 'system';
  senderName: string;
  avatarText?: string;
  text: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  actionCard?: {
    type: 'table_status' | 'booking_info' | 'helpline' | 'dietary';
    title: string;
    description: string;
    actionLabel?: string;
    onActionClick?: () => void;
  };
}

interface SupportChatLandscapeProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  reservations?: Reservation[];
  currentUser?: {
    userId?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  } | null;
  activeRestaurant?: Restaurant | null;
  onSelectRestaurantForBooking?: (restaurant: Restaurant) => void;
}

export const SupportChatLandscape: React.FC<SupportChatLandscapeProps> = ({
  isOpen,
  onClose,
  restaurants,
  reservations = [],
  currentUser,
  activeRestaurant,
  onSelectRestaurantForBooking,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'concierge' | 'availability' | 'dietary' | 'billing'>('concierge');
  const [inputText, setInputText] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const effectiveRestaurant = activeRestaurant || restaurants[0];

  // Pre-populated conversations for the landscape interface
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({
    concierge: [
      {
        id: 'msg-1',
        sender: 'system',
        senderName: 'FlashTable System',
        text: 'Live Dining Concierge Desk connected. Serving top Bengaluru dining establishments.',
        timestamp: 'Just now',
      },
      {
        id: 'msg-2',
        sender: 'concierge',
        senderName: 'Aarav (Lead Concierge)',
        avatarText: 'AC',
        text: `Namaste ${currentUser?.fullName ? currentUser.fullName.split(' ')[0] : 'Guest'}! Welcome to the FlashTable Concierge. How may I assist you with your table reservations or host inquiries today?`,
        timestamp: '1 min ago',
        status: 'read',
      },
    ],
    availability: [
      {
        id: 'msg-av-1',
        sender: 'concierge',
        senderName: 'Host Desk',
        avatarText: 'HD',
        text: `Looking for prime seating at ${effectiveRestaurant?.name || 'our venues'}? Let me know your preferred date, party size, and seating section.`,
        timestamp: '2 mins ago',
        status: 'read',
        actionCard: {
          type: 'table_status',
          title: 'Prime 2D Tables Open Today',
          description: `${effectiveRestaurant?.name || 'The Ember Room'} has window and booth tables available for 7:30 PM & 8:15 PM slots.`,
          actionLabel: 'View Table Map',
        },
      },
    ],
    dietary: [
      {
        id: 'msg-dt-1',
        sender: 'concierge',
        senderName: 'Chef & Safety Team',
        avatarText: 'CS',
        text: 'Our kitchens adhere to strict allergen safety tagging (Jain, Vegan, Gluten-Free, Nut-Free). Which dietary preferences can we accommodate for your table?',
        timestamp: '5 mins ago',
        status: 'read',
      },
    ],
    billing: [
      {
        id: 'msg-bl-1',
        sender: 'concierge',
        senderName: 'Accounts & Host Desk',
        avatarText: 'AH',
        text: 'All table reservation deposits are 100% credited against your final food and beverage dining bill upon arrival.',
        timestamp: '10 mins ago',
        status: 'read',
      },
    ],
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, selectedChannel, messages]);

  if (!isOpen) return null;

  const currentChatMessages = messages[selectedChannel] || [];

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'customer',
      senderName: currentUser?.fullName || 'You',
      text,
      timestamp: 'Just now',
      status: 'sent',
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChannel]: [...(prev[selectedChannel] || []), newMsg],
    }));

    if (!textToSend) setInputText('');

    // Simulate smart, prompt host reply in landscape layout
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      let replyText = "Thank you for reaching out! Our host team has recorded your note and will ensure your table preferences are prioritized.";
      let card: any = undefined;

      const lower = text.toLowerCase();
      if (lower.includes('table') || lower.includes('seat') || lower.includes('reserve')) {
        replyText = `We have verified table availability at ${effectiveRestaurant?.name}. Window booths and outdoor terrace seating are currently open for booking.`;
        card = {
          type: 'table_status',
          title: `${effectiveRestaurant?.name} Seating Plan`,
          description: `Exact 2D Table booking is active with live occupancy sync.`,
          actionLabel: 'Open Table Selector',
          onActionClick: () => {
            if (onSelectRestaurantForBooking && effectiveRestaurant) {
              onSelectRestaurantForBooking(effectiveRestaurant);
              onClose();
            }
          },
        };
      } else if (lower.includes('time') || lower.includes('delay') || lower.includes('eta') || lower.includes('arrival')) {
        replyText = "Understood! Your Smart Arrival geofence monitors your ETA within 500 meters so your table is prepared with hot food ready when you walk in.";
      } else if (lower.includes('bill') || lower.includes('deposit') || lower.includes('refund')) {
        replyText = "Your reservation deposit (₹300/table) is fully deducted from your final dining check. You can request a consolidated digital invoice directly in the app.";
      } else if (lower.includes('diet') || lower.includes('vegan') || lower.includes('jain') || lower.includes('allergy')) {
        replyText = "We have marked your dining session with dietary preferences. Our chef will be alerted immediately when your reservation pass is scanned.";
      }

      const botReply: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'concierge',
        senderName: 'Aarav (Lead Concierge)',
        avatarText: 'AC',
        text: replyText,
        timestamp: 'Just now',
        status: 'read',
        actionCard: card,
      };

      setMessages((prev) => ({
        ...prev,
        [selectedChannel]: [...(prev[selectedChannel] || []), botReply],
      }));
    }, 900);
  };

  const channelsList = [
    {
      id: 'concierge' as const,
      title: 'Table Host & Concierge',
      desc: 'Live table dining desk • Bengaluru',
      icon: MessageSquare,
      badge: 'Live',
      time: 'Instant',
    },
    {
      id: 'availability' as const,
      title: 'Table Availability & Slots',
      desc: 'Check live open tables & 2D layout',
      icon: Store,
      badge: 'Active',
      time: '1m avg',
    },
    {
      id: 'dietary' as const,
      title: 'Dietary & Allergen Guidance',
      desc: 'Jain, Vegan & allergen preferences',
      icon: Utensils,
      badge: 'Kitchen',
      time: '2m avg',
    },
    {
      id: 'billing' as const,
      title: 'Billing & Deposit Settlement',
      desc: 'Deposit adjustment & invoice support',
      icon: ShieldCheck,
      badge: 'Accounts',
      time: '2m avg',
    },
  ];

  const filteredChannels = channelsList.filter((c) =>
    c.title.toLowerCase().includes(channelSearch.toLowerCase()) ||
    c.desc.toLowerCase().includes(channelSearch.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      id="modal-support-chat-landscape"
      role="dialog"
      aria-modal="true"
    >
      {/* Landscape Container: Widescreen Horizontal Design */}
      <div 
        className="bg-white w-full max-w-5xl xl:max-w-6xl h-[88vh] max-h-[640px] rounded-3xl border border-[#E8E6E1] shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Landscape Bar */}
        <div className="bg-[#FAF9F6] border-b border-[#E8E6E1] px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4F6F52] text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#2C3333] font-serif">
                  FlashTable Dining Concierge Desk
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Live Response
                </span>
              </div>
              <p className="text-xs text-[#2C3333]/60 hidden sm:block">
                Direct communication with Bengaluru restaurant hosts and dining support
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${effectiveRestaurant?.customerCareNumber || '+91 98450 12260'}`}
              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-[#E8E6E1] text-[#2C3333] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Call Direct Customer Care Helpline"
            >
              <Phone className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span className="hidden md:inline">Helpline:</span>
              <span className="font-mono text-[11px] font-bold text-[#4F6F52]">
                {effectiveRestaurant?.customerCareNumber || '+91 98450 12260'}
              </span>
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
              aria-label="Close Chat"
              id="close-support-chat-landscape-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Horizontal 2-Column Body (Landscape Layout) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Column 1: Conversations & Desks (Width ~300-340px) */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-[#E8E6E1] bg-[#FAF9F6]/80 flex flex-col shrink-0">
            {/* Search Filter */}
            <div className="p-3 border-b border-[#E8E6E1]/60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={channelSearch}
                  onChange={(e) => setChannelSearch(e.target.value)}
                  placeholder="Search channels or topics..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E8E6E1] rounded-xl outline-none focus:border-[#4F6F52]"
                />
              </div>
            </div>

            {/* Channels List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredChannels.map((ch) => {
                const IconComponent = ch.icon;
                const isSelected = selectedChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch.id)}
                    className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-3 border ${
                      isSelected
                        ? 'bg-white border-[#4F6F52] shadow-sm ring-1 ring-[#4F6F52]/20'
                        : 'bg-white/60 hover:bg-white border-transparent hover:border-[#E8E6E1]'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#4F6F52] text-white' : 'bg-stone-100 text-stone-600'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#4F6F52]' : 'text-[#2C3333]'}`}>
                          {ch.title}
                        </span>
                        <span className="text-[10px] text-stone-400 shrink-0 font-medium">
                          {ch.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 truncate">
                        {ch.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Venue Context Card in Sidebar */}
            <div className="p-3.5 border-t border-[#E8E6E1] bg-white m-2 rounded-2xl shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-700">
                <span className="flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-[#4F6F52]" />
                  <span>Active Venue</span>
                </span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-semibold">
                  Bengaluru
                </span>
              </div>
              <p className="text-xs font-bold text-[#2C3333]">
                {effectiveRestaurant?.name || 'The Ember Room'}
              </p>
              <p className="text-[10px] text-stone-500 leading-snug">
                {effectiveRestaurant?.address || '100 Feet Road, Indiranagar, Bengaluru'}
              </p>
            </div>
          </div>

          {/* Column 2: Main Landscape Chat Area (Flex-1) */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            
            {/* Active Header inside Chat Area */}
            <div className="px-6 py-3 border-b border-[#E8E6E1]/70 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center font-bold text-xs">
                  AC
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2C3333]">
                    {channelsList.find((c) => c.id === selectedChannel)?.title || 'Dining Concierge'}
                  </h4>
                  <p className="text-[10px] text-emerald-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    <span>Online • Typical response time under 1 minute</span>
                  </p>
                </div>
              </div>

              {/* Quick info tags */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-500">
                <span className="px-2.5 py-1 rounded-full bg-stone-100 font-medium">
                  Direct Host Chat
                </span>
              </div>
            </div>

            {/* Quick Action Buttons (Landscape Layout - Horizontally Scrollable or Aligned) */}
            <div className="px-6 py-2 border-b border-[#E8E6E1]/50 bg-[#FAF9F6]/40 flex items-center gap-2 overflow-x-auto text-xs shrink-0 no-scrollbar">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 shrink-0">
                Quick Prompts:
              </span>
              {[
                'Check Table Availability',
                'Modify Booking Time',
                'Allergen & Chef Notes',
                'How Deposit is Adjusted',
                'Speak to Restaurant Host',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="px-3 py-1 rounded-full bg-white hover:bg-[#4F6F52]/10 border border-[#E8E6E1] hover:border-[#4F6F52]/40 text-[#2C3333] hover:text-[#4F6F52] text-[11px] font-medium transition-colors shrink-0 cursor-pointer shadow-2xs"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentChatMessages.map((msg) => {
                const isMe = msg.sender === 'customer';
                const isSystem = msg.sender === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center my-2">
                      <span className="inline-block px-3 py-1 rounded-full bg-stone-100 text-stone-500 text-[10px] font-medium border border-stone-200">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-[#4F6F52] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {msg.avatarText || 'H'}
                      </div>
                    )}

                    <div className={`max-w-[78%] sm:max-w-[70%] space-y-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-bold text-stone-500">
                          {msg.senderName}
                        </span>
                        <span className="text-[9px] text-stone-400 font-mono">
                          {msg.timestamp}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isMe
                            ? 'bg-[#4F6F52] text-white rounded-tr-xs'
                            : 'bg-[#FAF9F6] text-[#2C3333] border border-[#E8E6E1] rounded-tl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {/* Optional Rich Card attached to Message */}
                      {msg.actionCard && (
                        <div className="p-3 bg-white border border-[#E8E6E1] rounded-2xl shadow-xs space-y-2 mt-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#4F6F52]">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{msg.actionCard.title}</span>
                          </div>
                          <p className="text-[11px] text-stone-600 leading-snug">
                            {msg.actionCard.description}
                          </p>
                          {msg.actionCard.actionLabel && (
                            <button
                              type="button"
                              onClick={msg.actionCard.onActionClick}
                              className="px-3 py-1.5 rounded-xl bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              {msg.actionCard.actionLabel}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {isMe && (
                      <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        <User className="w-4 h-4 text-stone-600" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-center gap-2 text-stone-400 text-xs italic">
                  <div className="flex items-center gap-1 px-3 py-2 bg-stone-100 rounded-2xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce delay-200"></span>
                    <span className="text-[10px] text-stone-500 ml-1.5">Host is typing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Landscape Full-Width Input Box */}
            <div className="p-4 border-t border-[#E8E6E1] bg-[#FAF9F6]/80 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 max-w-full"
              >
                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your message to the restaurant host or dining concierge..."
                    className="w-full px-4 py-3 text-xs sm:text-sm bg-white border border-[#E8E6E1] rounded-2xl outline-none focus:border-[#4F6F52] text-[#2C3333] shadow-xs"
                    id="support-chat-landscape-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm shrink-0 ${
                    inputText.trim()
                      ? 'bg-[#4F6F52] hover:bg-[#3D5A40] text-white'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                  id="support-chat-landscape-send-btn"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
              <div className="mt-1.5 text-center text-[10px] text-stone-400">
                Press Enter to send • Protected by FlashTable Zero-Spam Dining Guarantee
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
