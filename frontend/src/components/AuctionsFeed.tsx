'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Clock, Gavel, ArrowUpRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SkeletonCard } from '@/components/SkeletonCard'
import toast from 'react-hot-toast'

interface Auction {
  id: string
  lead_id: string
  seller_id: string
  reason: string
  expected_price: string
  client_style: string
  screenshots: string[]
  start_price: number
  current_price: number
  highest_bidder_id: string | null
  ends_at: string
  leads: {
    title: string
    description: string
    price_balance: number
    image_url?: string
  }
}

export function AuctionsFeed() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [biddingId, setBiddingId] = useState<string | null>(null)
  const [bidAmounts, setBidAmounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchAuctions()

    const channel = supabase
      .channel('auctions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auctions' },
        (payload) => {
          console.log('Auction changed:', payload)
          fetchAuctions(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchAuctions = async (background = false) => {
    try {
      if (!background) setIsLoading(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auctions`)
      if (!res.ok) throw new Error('Failed to fetch auctions')
      const data = await res.json()
      setAuctions(data)
      
      // Init bid amounts (current + 1)
      const initialBids: Record<string, number> = {}
      data.forEach((a: Auction) => {
        initialBids[a.id] = a.current_price + 1
      })
      setBidAmounts(initialBids)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      if (!background) setIsLoading(false)
    }
  }

  const handleBid = async (auctionId: string) => {
    const amount = bidAmounts[auctionId]
    if (!amount) return

    try {
      setBiddingId(auctionId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to place bid')
      }

      toast.success('Ставка успешно принята!')
      fetchAuctions() // Refresh to get new prices and times
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBiddingId(null)
    }
  }

  const updateBidAmount = (auctionId: string, delta: number) => {
    setBidAmounts(prev => {
      const current = prev[auctionId] || 0
      const minBid = (auctions.find(a => a.id === auctionId)?.current_price || 0) + 1
      return { ...prev, [auctionId]: Math.max(minBid, current + delta) }
    })
  }

  const formatTimeLeft = (endsAt: string) => {
    const ms = new Date(endsAt).getTime() - new Date().getTime()
    if (ms <= 0) return 'Завершено'
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}ч ${mins}м`
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (auctions.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-500">
          <Gavel className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Нет активных аукционов</h3>
        <p className="text-neutral-500">Пока никто не выставил лиды на продажу.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {auctions.map(auction => (
          <motion.div
            key={auction.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-neutral-900 rounded-3xl border border-purple-200 dark:border-purple-900/50 overflow-hidden shadow-lg hover:shadow-xl transition-all flex flex-col"
          >
            {/* Header info */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-5 flex justify-between items-start border-b border-purple-100 dark:border-purple-900/50">
              <div>
                <span className="flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  Осталось: {formatTimeLeft(auction.ends_at)}
                </span>
                <h3 className="font-bold text-neutral-900 dark:text-white line-clamp-1">{auction.leads?.title}</h3>
              </div>
              <div className="bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 font-black px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700 shadow-sm flex items-center gap-1">
                💎 {auction.current_price}
              </div>
            </div>

            {auction.leads?.image_url && (
              <div className="w-full h-36 bg-neutral-100 dark:bg-neutral-800 relative">
                <img src={auction.leads.image_url} alt="Lead photo" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Auction Details */}
            <div className="p-5 flex-1 space-y-4">
              <div>
                <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Причина слива:</p>
                <p className="text-sm text-neutral-800 dark:text-neutral-200 italic border-l-2 border-purple-300 pl-3">"{auction.reason}"</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs text-neutral-500 mb-1">Стиль общения:</p>
                  <p className="font-medium dark:text-neutral-300">{auction.client_style || 'Не указан'}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs text-neutral-500 mb-1">Ожидания:</p>
                  <p className="font-medium dark:text-neutral-300">{auction.expected_price || 'Не указано'}</p>
                </div>
              </div>

              {auction.screenshots.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500 font-semibold mb-2">Скриншоты переписки:</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {auction.screenshots.map((url, i) => (
                      <img key={i} src={url} alt="screenshot" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-neutral-200 dark:border-neutral-700" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bidding Controls */}
            <div className="p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden flex-1">
                  <button onClick={() => updateBidAmount(auction.id, -1)} className="px-3 py-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700">-</button>
                  <input 
                    type="number"
                    value={bidAmounts[auction.id] || 0}
                    onChange={(e) => setBidAmounts({...bidAmounts, [auction.id]: parseInt(e.target.value) || 0})}
                    className="w-full text-center font-bold text-neutral-900 dark:text-white bg-transparent outline-none"
                  />
                  <button onClick={() => updateBidAmount(auction.id, 1)} className="px-3 py-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700">+</button>
                </div>
                <button
                  onClick={() => handleBid(auction.id)}
                  disabled={biddingId === auction.id || bidAmounts[auction.id] <= auction.current_price}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0"
                >
                  {biddingId === auction.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  Ставка
                </button>
              </div>
              <p className="text-xs text-center text-neutral-500">Мин. ставка: {auction.current_price + 1} 💎</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
