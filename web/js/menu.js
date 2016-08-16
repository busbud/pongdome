const items = Array.from(document.querySelectorAll('#menu-overlay ul li a'))

items.forEach(item => item.addEventListener('click', e => e.preventDefault()))

let index = 0;

exports.render = state => {
  if (!state) {
    document.querySelector('#menu-overlay').style.display = 'none'
    return
  }

  document.querySelector('#menu-overlay').style.display = 'flex'
}

exports.up = () => {
  index = index - 1
  if (index < 0) index = items.length - 1
  items[index].focus()
}

exports.down = () => {
  index = index + 1
  if (index >= items.length - 1) index = 0
  items[index].focus()
}

exports.select = api => {
  api.emit(items[index].dataset.event)
}
