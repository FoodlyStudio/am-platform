'use client'

import { PLSummary } from '@/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react'

interface PLDashboardProps {
  summary: PLSummary
}

export function PLDashboard({ summary }: PLDashboardProps) {
  const isProfit = summary.profit >= 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-secondary/20 flex items-center justify-center">
            <TrendingUp size={14} className="text-secondary" />
          </div>
          <span className="text-xs text-white/50">Revenue</span>
        </div>
        <p className="text-xl font-bold text-white">{formatCurrency(summary.revenue)}</p>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
            <TrendingDown size={14} className="text-accent" />
          </div>
          <span className="text-xs text-white/50">Expenses</span>
        </div>
        <p className="text-xl font-bold text-white">{formatCurrency(summary.expenses)}</p>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-7 h-7 rounded-lg ${isProfit ? 'bg-secondary/20' : 'bg-accent/20'} flex items-center justify-center`}>
            <DollarSign size={14} className={isProfit ? 'text-secondary' : 'text-accent'} />
          </div>
          <span className="text-xs text-white/50">Profit</span>
        </div>
        <p className={`text-xl font-bold ${isProfit ? 'text-secondary' : 'text-accent'}`}>
          {formatCurrency(summary.profit)}
        </p>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Percent size={14} className="text-primary" />
          </div>
          <span className="text-xs text-white/50">Margin</span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold text-white">{summary.margin}%</p>
          <Badge variant={summary.margin >= 30 ? 'success' : summary.margin >= 15 ? 'warning' : 'danger'}>
            {summary.margin >= 30 ? 'Good' : summary.margin >= 15 ? 'OK' : 'Low'}
          </Badge>
        </div>
      </Card>
    </div>
  )
}
