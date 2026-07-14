
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Search, Loader2, User, Building, FileText, CheckSquare, TrendingUp } from "lucide-react"
import { api } from "@/services/api"
import { useNavigate } from "react-router-dom"
import { useCurrency } from "@/contexts/CurrencyContext"

interface SearchResult {
  id: string;
  type: 'lead' | 'contact' | 'account' | 'opportunity' | 'task';
  title: string;
  subtitle: string;
  description?: string;
  status?: string;
  value?: number;
  assignedTo?: string;
  createdAt: string;
  url: string;
}


export function GlobalSearch() {
  const { formatCurrency } = useCurrency()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const navigate = useNavigate()
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const suggestionTimeout = useRef<NodeJS.Timeout | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearch = (value: string) => {
    setQuery(value)

    if (value.length < 1) {
      setResults([])
      setSuggestions([])
      setShowResults(false)
      setShowSuggestions(false)
      return
    }

    // Show suggestions for short queries
    if (value.length >= 1 && value.length < 2) {
      setShowSuggestions(true)
      setShowResults(false)

      if (suggestionTimeout.current) {
        clearTimeout(suggestionTimeout.current)
      }

      suggestionTimeout.current = setTimeout(async () => {
        try {
          const response = await api.get(`/search/suggestions?q=${encodeURIComponent(value)}`)
          const searchData = response.data.data || response.data;
          setSuggestions(Array.isArray(searchData.suggestions) ? searchData.suggestions : [])
        } catch (error) {
          console.error("Suggestions failed", error)
          setSuggestions([])
        }
      }, 200)
      return
    }

    // Perform full search for longer queries
    setIsLoading(true)
    setShowResults(true)
    setShowSuggestions(false)

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await api.get(`/search/global?q=${encodeURIComponent(value)}&limit=20`)
        const searchData = response.data.data || response.data;
        const rawResults = Array.isArray(searchData.results) ? searchData.results : [];
        setResults(rawResults.filter((r: unknown) => r && typeof r === 'object') as SearchResult[]);
      } catch (error) {
        console.error("Search failed", error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
  }

  const handleSelect = (result: SearchResult) => {
    setShowResults(false)
    setShowSuggestions(false)
    setQuery("") // Clear query on selection
    navigate(result.url)
  }

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion)
    handleSearch(suggestion)
    setShowSuggestions(false)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'lead': return <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      case 'contact': return <User className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'account': return <Building className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      case 'opportunity': return <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      case 'task': return <CheckSquare className="h-4 w-4 text-red-600 dark:text-red-400" />
      default: return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const formatValue = (value?: number) => {
    if (!value) return null
    return formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search leads, contacts, accounts..."
        className="pl-8 bg-background border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => {
          if (query.length >= 2) setShowResults(true)
          else if (query.length >= 1) setShowSuggestions(true)
        }}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-xl z-50 max-h-[300px] overflow-y-auto filter backdrop-blur-sm bg-popover/95">
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Suggestions
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full px-4 py-2 text-left hover:bg-muted text-popover-foreground flex items-center gap-3 transition-colors"
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search results dropdown */}
      {showResults && query.length >= 2 && (
        <div className="fixed sm:absolute top-16 sm:top-full left-0 right-0 sm:mt-2 bg-popover border-b sm:border border-border sm:rounded-xl shadow-2xl z-50 max-h-[85vh] sm:max-h-[400px] overflow-y-auto filter backdrop-blur-md bg-popover/95 animate-in fade-in slide-in-from-top-2 duration-200">
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <span>Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b border-border mb-1">
                {results.length} Results
              </div>
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-muted flex items-start gap-2 sm:gap-4 transition-colors border-b border-border last:border-b-0"
                  onClick={() => handleSelect(result)}
                >
                  <div className="shrink-0 mt-1 p-1.5 sm:p-2 rounded-lg bg-muted">
                    {getIcon(result.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm text-popover-foreground truncate">{result.title}</div>
                      {result.value && (
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 ml-2">
                          {formatValue(result.value)}
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-tight mt-0.5">
                      {result.type} • {result.subtitle}
                    </div>
                    {result.description && (
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {result.description}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      {result.assignedTo && (
                        <div className="text-[10px] text-muted-foreground flex items-center">
                          <div className="w-1 h-1 rounded-full bg-primary mr-2" />
                          {result.assignedTo}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground ml-auto">
                        {formatDate(result.createdAt)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium text-popover-foreground">No results found</p>
              <p className="text-xs mt-1">Try different keywords for "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
