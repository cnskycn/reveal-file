// reveal-file — Browser half (client bundle).
// Adds a right-click menu item on produced-file rows: "打开所在目录".
// Calls the host REST endpoint `/api/reveal-file/reveal` via fetch().
window.__ModuleLoader__.load({
  id: 'reveal-file',
  factory: (require) => {
    const React = require('react')
    const module = { exports: {} }

    const CSS =
      '.rfx-menu{position:fixed;z-index:9999;min-width:150px;padding:6px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 8px 28px rgba(0,0,0,.35)}' +
      '.rfx-menu-item{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:8px 12px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;cursor:pointer;text-align:left}' +
      '.rfx-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      '.rfx-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:10000;padding:10px 18px;border-radius:12px;background:rgba(0,0,0,.75);color:#fff;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.3)}'

    function insertCss() {
      if (typeof document === 'undefined') return
      if (document.getElementById('rfx-css')) return
      const tag = document.createElement('style')
      tag.id = 'rfx-css'
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    function toast(text) {
      const el = document.createElement('div')
      el.className = 'rfx-toast'
      el.textContent = text
      document.body.appendChild(el)
      setTimeout(function () { el.remove() }, 2600)
    }

    function showMenu(x, y, path) {
      const menu = document.createElement('div')
      menu.className = 'rfx-menu'
      menu.style.left = x + 'px'
      menu.style.top = y + 'px'
      const item = document.createElement('button')
      item.className = 'rfx-menu-item'
      item.innerHTML = '<span>📂</span><span>打开所在目录</span>'
      item.onclick = function () {
        menu.remove()
        doReveal(path)
      }
      menu.appendChild(item)
      document.body.appendChild(menu)
      function close(e) {
        if (e.target !== menu && !menu.contains(e.target)) {
          menu.remove()
          document.removeEventListener('click', close, true)
          document.removeEventListener('contextmenu', close, true)
        }
      }
      setTimeout(function () {
        document.addEventListener('click', close, true)
        document.addEventListener('contextmenu', close, true)
      }, 0)
    }

    function doReveal(path) {
      fetch('/api/reveal-file/reveal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: path })
      })
        .then(function (resp) { return resp.json() })
        .then(function (result) {
          if (result && result.ok === true) toast('已在资源管理器中打开')
          else toast('打开失败：' + (result && result.error ? result.error : '未知错误'))
        })
        .catch(function (err) { toast('打开失败：' + (err && err.message ? err.message : '网络错误')) })
    }

    function isProducedRow(el) {
      return el && typeof el.closest === 'function' && !!el.closest('[data-produced-files-row]')
    }

    function onContextMenu(e) {
      const target = e.target
      if (!target || typeof target.closest !== 'function') return
      const row = target.closest('[data-produced-files-row]')
      if (!row) return
      const btn = target.closest('button')
      const title = btn && btn.getAttribute ? btn.getAttribute('title') : null
      const path = (title || '').trim()
      if (!path) return
      e.preventDefault()
      e.stopPropagation()
      showMenu(e.clientX, e.clientY, path)
    }

    const inject = ['slots']
    function apply(ctx) {
      insertCss()
      if (typeof document !== 'undefined') {
        ctx.effect(function () {
          document.addEventListener('contextmenu', onContextMenu, true)
          return function () { document.removeEventListener('contextmenu', onContextMenu, true) }
        })
      }
    }

    module.exports = { apply, inject }
    return module.exports
  },
})
