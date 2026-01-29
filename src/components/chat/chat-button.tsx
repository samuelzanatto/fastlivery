import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '../ui/button'
import { MessageCircle } from 'lucide-react'

interface ChatButtonProps {
    onClick: () => void
    unreadCount?: number
    visible?: boolean
    className?: string
}

export function ChatButton({ onClick, unreadCount = 0, visible = true, className }: ChatButtonProps) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className={cn("fixed bottom-4 right-4 z-[1]", className)}
                >
                    <Button
                        size="icon"
                        onClick={onClick}
                        className="h-14 w-14 rounded-full bg-orange-500 hover:bg-orange-600 shadow-lg text-white relative"
                    >
                        <MessageCircle className="h-7 w-7" />

                        {/* Badge de não lidas */}
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-sm ring-2 ring-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
