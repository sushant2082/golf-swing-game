import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { searchPlayers, resolvePlayer } from '../game/search.js'

/**
 * Autocomplete guess field.
 *
 * Implements the ARIA combobox pattern so the whole thing is usable from the
 * keyboard alone: arrows move the active option, Enter commits it, Escape
 * closes the list without clearing what was typed.
 */
export default function GuessInput({ onGuess, disabled, alreadyGuessed }) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()

  const suggestions = useMemo(() => (value.trim() ? searchPlayers(value) : []), [value])

  useEffect(() => setActive(0), [value])

  // Keep the highlighted option in view when arrowing through a long list.
  useEffect(() => {
    const el = listRef.current?.children?.[active]
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const commit = (player) => {
    if (!player) return
    if (alreadyGuessed.includes(player.id)) {
      setError(`You already guessed ${player.name}.`)
      return
    }
    onGuess(player)
    setValue('')
    setOpen(false)
    setError('')
  }

  const submit = () => {
    if (disabled) return
    const picked = open && suggestions[active] ? suggestions[active] : resolvePlayer(value)
    if (!picked) {
      setError(value.trim() ? 'No golfer by that name — pick one from the list.' : '')
      return
    }
    commit(picked)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!suggestions.length) return
      e.preventDefault()
      setOpen(true)
      setActive((i) => {
        const n = suggestions.length
        return e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && suggestions[active] ? `${listId}-opt-${active}` : undefined
            }
            aria-label="Guess the golfer"
            autoComplete="off"
            spellCheck="false"
            disabled={disabled}
            placeholder={disabled ? 'Round complete' : 'Which golfer is it?'}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setOpen(true)
              setError('')
            }}
            onKeyDown={onKeyDown}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onFocus={() => value.trim() && setOpen(true)}
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/25 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:disabled:bg-stone-800"
          />

          {open && suggestions.length > 0 && (
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Golfer suggestions"
              className="absolute bottom-full z-20 mb-2 max-h-64 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-xl dark:border-stone-700 dark:bg-stone-900"
            >
              {suggestions.map((p, i) => {
                const used = alreadyGuessed.includes(p.id)
                return (
                  <li
                    key={p.id}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    aria-disabled={used || undefined}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      commit(p)
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                      i === active
                        ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100'
                        : 'text-stone-700 dark:text-stone-200'
                    } ${used ? 'opacity-40' : ''}`}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
                      {used ? 'guessed' : p.tour}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700 dark:focus-visible:ring-offset-stone-950"
        >
          Guess
        </button>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    </div>
  )
}
