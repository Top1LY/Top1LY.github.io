// 获取URL参数
function getUrlParam(name) {
  const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
  const r = window.location.search.substr(1).match(reg);
  if (r != null) return decodeURIComponent(r[2]);
  return null;
}
const hostId = getUrlParam('host');
if(!hostId){
  document.body.innerHTML = "<div class='container'><h2>请选择主播</h2><a href='index.html'>返回首页</a></div>";
}

// 加载对应主播歌单
let songData = [];
const storageKey = "song_order_" + hostId;

async function loadSongList(){
  const res = await fetch(`data/${hostId}.json`);
  songData = await res.json();
  renderList(songData);
  document.getElementById("hostName").innerText = hostId + " 的直播间歌单";
}

// 渲染歌单
function renderList(list){
  const wrap = document.getElementById("songList");
  const localOrdered = JSON.parse(localStorage.getItem(storageKey) || "[]");
  wrap.innerHTML = "";
  list.forEach((song,idx)=>{
    const isOrdered = localOrdered.includes(song.id);
    const div = document.createElement("div");
    div.className = "song-item" + (isOrdered ? " ordered" : "");
    div.innerHTML = `
      <div class="song-info">
        <div class="song-name">${song.name}</div>
        <div class="singer">${song.singer}</div>
      </div>
      <button class="order-btn">${isOrdered ? "已点" : "点歌"}</button>
    `;
    div.querySelector(".order-btn").onclick = ()=>{
      let arr = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if(!arr.includes(song.id)) arr.push(song.id);
      localStorage.setItem(storageKey, JSON.stringify(arr));
      renderList(list);
    }
    wrap.appendChild(div);
  })
}

// 搜索
document.getElementById("searchInput").oninput = (e)=>{
  const kw = e.target.value.toLowerCase();
  const filter = songData.filter(s=> s.name.toLowerCase().includes(kw) || s.singer.toLowerCase().includes(kw));
  renderList(filter);
}

// 清空已点
document.getElementById("clearBtn").onclick = ()=>{
  localStorage.removeItem(storageKey);
  renderList(songData);
}

loadSongList();
