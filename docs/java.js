const { defaultMenu, ingredientCatalog, photos, menuStorageKey: MENU_STORAGE_KEY } = window.BAIG_DATA;

function loadMenu() {
  try {
    const savedMenu = JSON.parse(localStorage.getItem(MENU_STORAGE_KEY));
    const isValidMenu = Array.isArray(savedMenu) &&
      savedMenu.length > 0 &&
      savedMenu.every((product) => Array.isArray(product) && product.length >= 5);

    if (isValidMenu) return savedMenu;
  } catch {
    // Use the default menu if saved data is missing or invalid.
  }

  return defaultMenu.map((product) => product.slice());
}

let menu=loadMenu();
function escapeHtml(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    [String.fromCharCode(34)]: "&quot;",
    [String.fromCharCode(39)]: "&#39;",
  };

  return String(value ?? "").replace(/[&<>"']/g, (character) => entities[character]);
}

function isFixedIngredient(item) {
  return /(^|\s)(pan(es)?|carne|medallones?|hamburguesas?|burgers?)(\s|$)/i.test(item);
}

function productIngredients(product) {
  const savedIngredients = product[6];
  const ingredients = Array.isArray(savedIngredients) && savedIngredients.length
  ? savedIngredients
  : ingredientCatalog[product[0]] || String(product[4] || "")
  .replace(/[.!]/g, "")
  .split(/,| y /i)
  .map((item) => item.trim())
  .filter(Boolean);

  return ingredients.filter((item) => !isFixedIngredient(item));
}

function renderIngredientOptions() {
  const options = productIngredients(selectedProduct);
  const container = document.querySelector("#ingredientOptions");

  container.innerHTML = options.map((item, index) =>
  '<label class="ingredientOption">' +
  '<input type="checkbox" data-ingredient="' + index + '" checked>' +
  '<span>' + escapeHtml(item) + '</span>' +
  '</label>'
  ).join("");
}

function productPhoto(product) {
  const source = product[5] || photos[product[0]] || "./burguers/banner-baig.jpg";
  const isSafePath = /^(https?:\/\/|\.\.?\/)/i.test(source);

  return isSafePath ? source : "./burguers/banner-baig.jpg";
}

function saveMenu() {
  localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menu));
}

let cat = "Todos";
let bag = [];
let mode = "Delivery";
let scheduleDate = "";
let scheduleTime = "";

function money(amount) {
  return "$ " + Math.round(amount).toLocaleString("es-AR");
}

function total() {
  return bag.reduce((sum, line) => {
    const product = menu.find((item) => item[0] === line.productName);
    return sum + (product ? product[2] * line.quantity : 0);
  }, 0);
}

function count() {
  return bag.reduce((sum, line) => sum + line.quantity, 0);
}

function selectedPayment() {
  return document.querySelector('input[name="payment"]:checked')?.value || "";
}

function deliveryCost() {
  return mode === "Delivery" && count() > 0
    ? window.BAIG_DATA.business.deliveryFee
    : 0;
}

function transferCost() {
  return selectedPayment() === "Transferencia" && count() > 0
    ? window.BAIG_DATA.business.transferFee
    : 0;
}

function selectedTipPercent() {
  return Number(document.querySelector('input[name="tipPercent"]:checked')?.value) || 0;
}

function tipCost() {
  return Math.round(total() * selectedTipPercent() / 100);
}

function orderTotal() {
  return total() + deliveryCost() + transferCost() + tipCost();
}

function draw() {
  const query = document.querySelector("#q").value.toLowerCase();
  const visibleProducts = menu.filter((product) =>
  (cat === "Todos" || product[1] === cat) &&
  (product[0] + " " + product[4]).toLowerCase().includes(query)
  );

  document.querySelector("#grid").innerHTML = visibleProducts
  .map(renderProductCard)
  .join("");
  document.querySelector("#label").textContent =
  cat === "Todos" ? "Los más pedidos" : cat;
}

function renderProductCard(product) {
  const name = escapeHtml(product[0]);

  return [
  '<article class="card productCard" data-product="' + name + '" role="button" tabindex="0" aria-label="Ver detalles de ' + name + '">',
  '  <div class="pic"><img src="' + escapeHtml(productPhoto(product)) + '" alt="' + name + '" loading="lazy"></div>',
  '  <div class="body">',
  '    <div class="tag">' + escapeHtml(product[3]) + '</div>',
  '    <h3>' + name + '</h3>',
  '    <p>' + escapeHtml(product[4]) + '</p>',
  '    <div class="bottom"><span>' + money(product[2]) + '</span><span aria-hidden="true">Ver detalle →</span></div>',
  '  </div>',
  '</article>',
  ].join("");
}

let selectedProduct=null;

function updateUnitTotal() {
  const quantity = Math.max(1, parseInt(document.querySelector("#unitInput").value, 10) || 1);
  document.querySelector("#unitInput").value = quantity;

  if (selectedProduct) {
    document.querySelector("#unitTotal").textContent =
      "Subtotal de este producto: " + money(quantity * selectedProduct[2]);
  }
}

function openProduct(name){selectedProduct=menu.find(x=>x[0]===name);

  if(!selectedProduct)return;

  document.querySelector("#detailPhoto").src=productPhoto(selectedProduct);

  document.querySelector("#detailPhoto").alt=name;

  document.querySelector("#detailTag").textContent=selectedProduct[3];

  document.querySelector("#detailName").textContent=name;

  document.querySelector("#detailDescription").textContent=selectedProduct[4];

  document.querySelector("#detailPrice").textContent=money(selectedProduct[2])+" c/u";

  renderIngredientOptions();

  document.querySelector("#unitInput").value=1;

  updateUnitTotal();

  const modal=document.querySelector("#productModal");

  modal.style.display="flex";

  modal.setAttribute("aria-hidden","false");

  modal.classList.add("show");

  document.body.style.overflow="hidden"}

function closeProduct() {
  const modal = document.querySelector("#productModal");
  modal.classList.remove("show");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function addSelectedProduct() {
  if (!selectedProduct) return;

  const ingredients = productIngredients(selectedProduct);
  const removed = Array.from(document.querySelectorAll("#ingredientOptions input:not(:checked)"))
  .map((input) => ingredients[Number(input.dataset.ingredient)])
  .filter(Boolean)
  .sort((first, second) => first.localeCompare(second, "es"));
  const quantity = Math.max(1, parseInt(document.querySelector("#unitInput").value, 10) || 1);
  const existingLine = bag.find((line) =>
  line.productName === selectedProduct[0] &&
  JSON.stringify(line.removedIngredients) === JSON.stringify(removed)
  );

  if (existingLine) {
    existingLine.quantity += quantity;
  } else {
    bag.push({
      id: "line-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      productName: selectedProduct[0],
      quantity,
      removedIngredients: removed,
    });
  }

  closeProduct();
  render();
  notice(quantity + " × " + selectedProduct[0] + " agregado al carrito");
}

function updateSubmitButton() {
  const form = document.querySelector("#checkoutForm");
  const button = document.querySelector("#submitOrder");
  const selectedTip = document.querySelector('input[name="tipPercent"]:checked');

  button.disabled = !count() || !form.checkValidity() || !selectedTip;
}

function render() {
  const itemCount = count();
  const productSubtotal = total();
  const summary = document.querySelector("#summary");

  document.querySelector("#headCount").textContent = itemCount;
  document.querySelector("#count").textContent =
  itemCount + " producto" + (itemCount === 1 ? "" : "s");
  document.querySelector("#total").textContent = money(productSubtotal);
  document.querySelector("#cart").classList.toggle("show", itemCount > 0);
  summary.innerHTML = bag.map(renderCartLine).join("");
  document.querySelector("#emptyCart").hidden = itemCount > 0;

  document.querySelectorAll(".tipValue").forEach((element) => {
    const percent = Number(element.dataset.tipPercent);
    element.textContent = money(Math.round(productSubtotal * percent / 100));
  });

  renderCostBreakdown(productSubtotal);
  document.querySelector("#finalTotal").textContent = money(orderTotal());
  updateSubmitButton();
}

function renderCartLine(line) {
  const product = menu.find((item) => item[0] === line.productName);
  if (!product) return "";

  const name = escapeHtml(product[0]);
  const removedLabel = line.removedIngredients.length
  ? '<small class="removedIngredients">Sin: ' +
  escapeHtml(line.removedIngredients.join(", ")) + '</small>'
  : "";

  return [
  '<div class="summaryRow">',
  '  <span>' + name + ' × ' + line.quantity + removedLabel + '</span>',
  '  <span>' + money(product[2] * line.quantity) + '</span>',
  '  <span class="rowActions">',
  '    <button type="button" data-remove-line="' + line.id + '" aria-label="Quitar uno de ' + name + '">−</button>',
  '    <button type="button" data-add-line="' + line.id + '" aria-label="Agregar uno de ' + name + '">+</button>',
  '    <button type="button" data-delete-line="' + line.id + '" aria-label="Eliminar ' + name + ' del carrito">Eliminar</button>',
  '  </span>',
  '</div>',
  ].join("");
}

function renderCostBreakdown(productSubtotal) {
  const additionalCosts = [
  deliveryCost() && '<div class="costRow"><span>Delivery</span><b>' + money(deliveryCost()) + '</b></div>',
  transferCost() && '<div class="costRow"><span>Recargo Transferencia</span><b>' + money(transferCost()) + '</b></div>',
  tipCost() && '<div class="costRow"><span>Propina</span><b>' + money(tipCost()) + '</b></div>',
  ].filter(Boolean).join("");
  const additionalHeading = additionalCosts
  ? '<div class="costRow totalBase"><strong>Gastos adicionales</strong></div>'
  : "";

  document.querySelector("#costBreakdown").innerHTML =
  '<div class="costRow totalBase"><span>Subtotal de productos</span><b>' +
  money(productSubtotal) + '</b></div>' + additionalHeading + additionalCosts;
}

function addLine(id){const line=bag.find(item=>item.id===id);

  if(line)line.quantity++;

  render()}

function removeLine(id){const index=bag.findIndex(item=>item.id===id);

  if(index<0)return;

  if(--bag[index].quantity<=0)bag.splice(index,1);

  render()}

function deleteLine(id){const index=bag.findIndex(item=>item.id===id);

  if(index<0)return;

  const name=bag[index].productName;

  bag.splice(index,1);

  render();

  notice(name+" eliminado del carrito")}

function openCart(){document.querySelector("#cartModal").classList.add("show");

  document.body.style.overflow="hidden"}

function closeCart(){document.querySelector("#cartModal").classList.remove("show");

  document.body.style.overflow=""}

function notice(s){let t=document.querySelector("#toast");

  t.textContent=s;

  t.classList.add("show");

  setTimeout(()=>t.classList.remove("show"),1700)}

const ADMIN_USERNAME='admin',ADMIN_PASSWORD='admin';

let adminAuthenticated=false;

function openAdmin(){const modal=document.querySelector('#adminModal');

  modal.classList.add('show');

  modal.setAttribute('aria-hidden','false');

  document.body.style.overflow='hidden';

  document.querySelector('#adminLogin').hidden=adminAuthenticated;

  document.querySelector('#adminDashboard').hidden=!adminAuthenticated;

  if(adminAuthenticated)renderAdminProducts()}

function closeAdmin(){const modal=document.querySelector('#adminModal');

  modal.classList.remove('show');

  modal.setAttribute('aria-hidden','true');

  document.body.style.overflow=''}

function renderAdminProducts() {
  document.querySelector("#adminProductList").innerHTML = menu.map((product, index) => {
    const name = escapeHtml(product[0]);

    return [
    '<div class="adminProductRow">',
    '  <div><strong>' + name + '</strong><small>' + escapeHtml(product[1]) + ' · ' + money(product[2]) + '</small></div>',
    '  <div class="adminProductActions">',
    '    <button type="button" data-admin-edit="' + index + '">Editar</button>',
    '    <button type="button" class="adminDelete" data-admin-delete="' + index + '">Eliminar</button>',
    '  </div>',
    '</div>',
    ].join("");
  }).join("");
}

function resetProductForm(){document.querySelector('#productForm').reset();

  document.querySelector('#productIndex').value='';

  document.querySelector('#saveProduct').textContent='Agregar producto';

  document.querySelector('#cancelEdit').hidden=true}

document.querySelector('#adminOpen').addEventListener('click',openAdmin);

document.querySelector('#adminClose').addEventListener('click',closeAdmin);

document.querySelector('#adminModal').addEventListener('click',e=>{if(e.target.id==='adminModal')closeAdmin()});

document.querySelector('#adminLogout').addEventListener('click',()=>{adminAuthenticated=false;

  document.querySelector('#adminDashboard').hidden=true;

  document.querySelector('#adminLogin').hidden=false;

  document.querySelector('#adminLoginForm').reset();

  document.querySelector('#adminLoginError').textContent='';

  resetProductForm()});

document.querySelector('#adminLoginForm').addEventListener('submit',e=>{e.preventDefault();

  const user=document.querySelector('#adminUser').value.trim(),password=document.querySelector('#adminPassword').value;

  if(user===ADMIN_USERNAME&&password===ADMIN_PASSWORD){adminAuthenticated=true;

    document.querySelector('#adminLogin').hidden=true;

    document.querySelector('#adminDashboard').hidden=false;

    document.querySelector('#adminLoginError').textContent='';

    renderAdminProducts()}else document.querySelector('#adminLoginError').textContent='Usuario o contraseña incorrectos.'});

document.querySelector('#productForm').addEventListener('submit',e=>{e.preventDefault();

  if(!adminAuthenticated)return;

  const name = document.querySelector("#productName").value.trim();
  const category = document.querySelector("#productCategory").value;
  const price = Number(document.querySelector("#productPrice").value);
  const tag = document.querySelector("#productTag").value.trim() || "NUEVO";
  const description = document.querySelector("#productDescription").value.trim();
  const image = document.querySelector("#productImage").value.trim();
  const ingredients = document.querySelector("#productIngredients").value
  .split(",")
  .map((item) => item.trim())
  .filter((item) => item && !isFixedIngredient(item));
  const indexValue = document.querySelector("#productIndex").value;
  const index = indexValue === "" ? -1 : Number(indexValue);

  if(!name||!Number.isFinite(price)||price<0||!description||!ingredients.length)return;

  if(menu.some((p,i)=>i!==index&&p[0].trim().toLocaleLowerCase()===name.toLocaleLowerCase())){notice('Ya existe un producto con ese nombre.');

    return}

  const old=index>=0?menu[index]:null,product=[name,category,price,tag,description,image||(old?old[5]||'':''),ingredients];

  if(old){if(old[0]!==name)bag.forEach(line=>{if(line.productName===old[0])line.productName=name});

    menu[index]=product}else menu.push(product);

  try{saveMenu()}catch{notice('No se pudieron guardar los cambios en este navegador.');

    return}draw();

  render();

  renderAdminProducts();

  resetProductForm();

  notice(old?'Producto actualizado.':'Producto agregado.')});

document.querySelector('#cancelEdit').addEventListener('click',resetProductForm);

document.querySelector('#adminProductList').addEventListener('click',e=>{const edit=e.target.closest('[data-admin-edit]'),remove=e.target.closest('[data-admin-delete]');

  if(edit){const index=Number(edit.dataset.adminEdit),p=menu[index];

    if(!p)return;

    document.querySelector('#productIndex').value=index;

    document.querySelector('#productName').value=p[0];

    document.querySelector('#productCategory').value=p[1];

    document.querySelector('#productPrice').value=p[2];

    document.querySelector('#productTag').value=p[3];

    document.querySelector('#productDescription').value=p[4];

    document.querySelector('#productImage').value=p[5]||'';

    document.querySelector('#productIngredients').value=productIngredients(p).join(', ');

    document.querySelector('#saveProduct').textContent='Guardar cambios';

    document.querySelector('#cancelEdit').hidden=false;

    document.querySelector('#productName').focus()}else if(remove){const index=Number(remove.dataset.adminDelete),p=menu[index];

    if(!p||!confirm('¿Eliminar '+p[0]+' de la carta?'))return;

    bag=bag.filter(line=>line.productName!==p[0]);

    menu.splice(index,1);

    try{saveMenu()}catch{notice('No se pudieron guardar los cambios.');

      return}draw();

    render();

    renderAdminProducts();

    notice('Producto eliminado.')}});

document.querySelector("#grid").addEventListener("click",e=>{let card=e.target.closest("[data-product]");

  if(card)openProduct(card.dataset.product)});

document.querySelector("#grid").addEventListener("keydown",e=>{let card=e.target.closest("[data-product]");

  if(card&&(e.key==="Enter"||e.key===" ")){e.preventDefault();

    openProduct(card.dataset.product)}});

document.querySelector("#unitMinus").onclick=()=>{document.querySelector("#unitInput").value=Math.max(1,(parseInt(document.querySelector("#unitInput").value,10)||1)-1);

  updateUnitTotal()};

document.querySelector("#unitPlus").onclick=()=>{document.querySelector("#unitInput").value=(parseInt(document.querySelector("#unitInput").value,10)||1)+1;

  updateUnitTotal()};

document.querySelector("#unitInput").oninput=updateUnitTotal;

document.querySelector("#addSelected").onclick=addSelectedProduct;

document.querySelector("#closeProduct").onclick=closeProduct;

document.querySelector("#productModal").onclick=e=>{if(e.target.id==="productModal")closeProduct()};

document.querySelector("#summary").addEventListener("click",e=>{let r=e.target.closest("[data-remove-line]"),a=e.target.closest("[data-add-line]"),d=e.target.closest("[data-delete-line]");

  if(r)removeLine(r.dataset.removeLine);

  if(a)addLine(a.dataset.addLine);

  if(d)deleteLine(d.dataset.deleteLine)});

document.querySelector("#q").oninput=draw;

document.querySelector("#chips").onclick=e=>{if(e.target.dataset.cat){cat=e.target.dataset.cat;

    document.querySelectorAll("#chips button").forEach(b=>b.classList.toggle("sel",b===e.target));

    draw()}};

document.querySelector("#modes").onclick=e=>{if(e.target.dataset.mode){mode=e.target.dataset.mode;

    updateScheduleButton();

    document.querySelectorAll("#modes button").forEach(b=>b.classList.toggle("sel",b===e.target));

    document.querySelector("#addressBox").hidden=mode!=="Delivery";

    document.querySelector("#address").required=mode==="Delivery";

    render()}};

document.querySelector("#cartOpen").onclick=openCart;

document.querySelector("#cartBarOpen").onclick=openCart;

document.querySelector("#closeCart").onclick=closeCart;

document.querySelector("#cartModal").onclick=e=>{if(e.target.id==="cartModal")closeCart()};

document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeCart();

    closeProduct();

    closeSchedule();

    closeAdmin()}});

document.querySelector("#checkoutForm").addEventListener("change",e=>{if(e.target.name==="payment"){document.querySelector("#transferAlias").hidden=e.target.value!=="Transferencia";

    render()}if(e.target.name==="tipPercent")render()});

document.querySelector("#checkoutForm").addEventListener("input",render);

const BUSINESS_WHATSAPP=window.BAIG_DATA.business.whatsapp;

document.querySelector("#checkoutForm").onsubmit=e=>{e.preventDefault();

  if(!count()){notice("Agregá productos antes de continuar");

    return}

  const target=BUSINESS_WHATSAPP.replace(/\D/g,"");

  if(!/^\d{10,15}$/.test(target)){notice("Falta configurar el WhatsApp del local.");

    return}

  const payment=document.querySelector('input[name="payment"]:checked');

  if(!payment){notice("Elegí un método de pago.");

    return}

  const first = document.querySelector("#firstName").value.trim();
  const last = document.querySelector("#lastName").value.trim();
  const area = document.querySelector("#area").value.replace(/\D/g, "");
  const phone = document.querySelector("#phone").value.trim();
  const address = document.querySelector("#address").value.trim();
  const extra = document.querySelector("#extra").value.trim();

  const items = bag.map((line) => {
    const product = menu.find((item) => item[0] === line.productName);
    if (!product) return "";

    const removedNote = line.removedIngredients.length
    ? " (Sin: " + line.removedIngredients.join(", ") + ")"
    : "";
    return line.quantity + " × " + product[0] + removedNote + " — " +
    money(product[2] * line.quantity);
  }).filter(Boolean);

  const orderNumber=makeOrderNumber();

  const customerPhone="+"+area+" "+phone;

  const lines=[(mode==="Delivery"?"DELIVERY":mode.toUpperCase())+" "+customerPhone,"Hola, soy "+first+" "+last+" y realicé el siguiente pedido:","","N.º de pedido: "+orderNumber];

  if(scheduleDate&&scheduleTime)lines.push("Programación de "+(mode==="Retirar"?"retiro":"entrega")+": "+formatWhatsAppDate(scheduleDate)+" a las "+scheduleTime);

  else lines.push("Programación: Lo antes posible");

  lines.push("",items.join("\n"));

  lines.push("","Subtotal de productos: "+money(total()));

  if(deliveryCost())lines.push("Delivery: "+money(deliveryCost()));

  if(transferCost())lines.push("Recargo Transferencia: "+money(transferCost()));

  if(tipCost())lines.push("Propina ("+selectedTipPercent()+"%): "+money(tipCost()));

  lines.push("","TOTAL "+money(orderTotal())+" (Pago "+payment.value+")");

  if(payment.value==="Transferencia")lines.push("Luego de que confirmen el pedido, enviaré el comprobante por este mismo chat.");

  if(mode==="Delivery")lines.push("","Dirección:",address);

  const waUrl="https://wa.me/"+target+"?text="+encodeURIComponent(lines.join("\n"));

  window.open(waUrl,"_blank","noopener");

  notice("Revisá el mensaje y tocá Enviar en WhatsApp.")
};
function scheduleModeWord(){

  return mode==="Retirar"?"retiro":"entrega"
}
function formatScheduledDate(value){

  return new Date(value+"T12:00:00").toLocaleDateString("es-AR",{

    weekday:"short",day:"numeric",month:"short"
  })
}
function formatWhatsAppDate(value){

  return new Date(value+"T12:00:00").toLocaleDateString("es-AR",{

    weekday:"long",day:"numeric",month:"long",year:"numeric"
  })
}
function updateScheduleButton(){

  const kind=scheduleModeWord(),button=document.querySelector("#scheduleButtonLabel");

  if(!button)return;

  button.textContent="Programar "+kind;

  document.querySelector("#scheduleTitle").textContent="Programar "+kind
}
function openSchedule(){

  const dateInput = document.querySelector("#scheduleDate");

  const timeInput = document.querySelector("#scheduleTime");

  const now = new Date();

  const today = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
  ].join("-");

  dateInput.min = today;

  dateInput.value = scheduleDate || today;

  timeInput.value = scheduleTime;

  updateScheduleButton();

  document.querySelector("#scheduleModal").classList.add("show");

  document.querySelector("#scheduleModal").setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";

}
function closeSchedule(){

  const modal=document.querySelector("#scheduleModal");

  if(!modal)return;

  modal.classList.remove("show");

  modal.setAttribute("aria-hidden","true");

  document.body.style.overflow=""
}
function confirmSchedule(){

  const dateInput=document.querySelector("#scheduleDate"),timeInput=document.querySelector("#scheduleTime"),date=dateInput.value,time=timeInput.value;

  if(!date||!time){

    notice("Elegí un día y un horario para programar.");

    return
  }

  const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");

  if(date<today||(date===today&&time<=now.toTimeString().slice(0,5))){

    notice("Elegí un horario futuro.");

    return
  }
  scheduleDate=date;

  scheduleTime=time;

  updateScheduleButton();

  closeSchedule();

  notice("Programación guardada para "+formatScheduledDate(date)+" a las "+time)
}
function makeOrderNumber(){

  const d=new Date(),stamp=[String(d.getFullYear()).slice(-2),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("");

  const suffix=Math.random().toString(36).slice(2,6).toUpperCase();

  return "BAIG-"+stamp+"-"+suffix
}
document.querySelector("#scheduleOpen").addEventListener("click",openSchedule);
document.querySelector("#scheduleClose").addEventListener("click",closeSchedule);
document.querySelector("#scheduleCancel").addEventListener("click",closeSchedule);
document.querySelector("#scheduleConfirm").addEventListener("click",confirmSchedule);
document.querySelector("#scheduleModal").addEventListener("click",e=>{

  if(e.target.id==="scheduleModal")closeSchedule()
});
updateScheduleButton();
draw();
render();
document.addEventListener("click",function(event){

  const button=event.target.closest("button");

  if(!button)return;

  button.classList.remove("click-pop");

  void button.offsetWidth;

  button.classList.add("click-pop");

  button.addEventListener("animationend",()=>button.classList.remove("click-pop"),{

    once:true
  })
});
