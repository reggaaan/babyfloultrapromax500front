const cartSidebar = document.getElementById("cartSidebar");
const openCart = document.getElementById("openCart");
const closeCart = document.getElementById("closeCart");

const cartCount = document.getElementById("cart-count");
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");

const addCartButtons =
document.querySelectorAll(".add-cart-btn");

const searchInput =
document.getElementById("searchInput");

const authModal =
document.getElementById("authModal");

const openLogin =
document.getElementById("openLogin");

const closeAuth =
document.getElementById("closeAuth");

let cart = [];

/* OPEN CART */

openCart.addEventListener("click", () => {
  cartSidebar.classList.add("active");
});

closeCart.addEventListener("click", () => {
  cartSidebar.classList.remove("active");
});

/* LOGIN */

openLogin.addEventListener("click", () => {
  authModal.classList.add("active");
});

closeAuth.addEventListener("click", () => {
  authModal.classList.remove("active");
});

/* ADD TO CART */

addCartButtons.forEach(button => {

  button.addEventListener("click", () => {

    const name =
    button.dataset.name;

    const price =
    parseFloat(button.dataset.price);

    const existing =
    cart.find(item => item.name === name);

    if(existing){

      existing.quantity++;

    } else {

      cart.push({
        name,
        price,
        quantity:1
      });

    }

    updateCart();

    showToast(`${name} added to cart`);

  });

});

/* UPDATE CART */

function updateCart(){

  cartItems.innerHTML = "";

  let total = 0;
  let count = 0;

  cart.forEach((item,index)=>{

    total += item.price * item.quantity;
    count += item.quantity;

    cartItems.innerHTML += `
      <div class="cart-item">
        <h4>${item.name}</h4>

        <p>₱${item.price}</p>

        <div class="quantity-controls">

          <button onclick="decreaseQty(${index})">
            -
          </button>

          <span>${item.quantity}</span>

          <button onclick="increaseQty(${index})">
            +
          </button>

          <button onclick="removeItem(${index})">
            Remove
          </button>

        </div>
      </div>
    `;

  });

  cartCount.textContent = count;
  cartTotal.textContent = total.toFixed(2);

  localStorage.setItem(
    "babyfloCart",
    JSON.stringify(cart)
  );

}

/* QUANTITY */

function increaseQty(index){

  cart[index].quantity++;
  updateCart();

}

function decreaseQty(index){

  if(cart[index].quantity > 1){

    cart[index].quantity--;

  } else {

    cart.splice(index,1);

  }

  updateCart();

}

function removeItem(index){

  cart.splice(index,1);
  updateCart();

}

/* LOCAL STORAGE */

window.onload = () => {

  const savedCart =
  localStorage.getItem("babyfloCart");

  if(savedCart){

    cart = JSON.parse(savedCart);
    updateCart();

  }

};

/* SEARCH */

searchInput.addEventListener("keyup", () => {

  const value =
  searchInput.value.toLowerCase();

  const products =
  document.querySelectorAll(".product-card");

  products.forEach(product => {

    const text =
    product.textContent.toLowerCase();

    product.style.display =
    text.includes(value)
    ? "block"
    : "none";

  });

});

/* VOUCHER */

document
.getElementById("applyVoucher")
.addEventListener("click",()=>{

  const voucher =
  document
  .getElementById("voucherInput")
  .value;

  if(voucher === "BABY15"){

    let total =
    parseFloat(cartTotal.textContent);

    total *= 0.85;

    cartTotal.textContent =
    total.toFixed(2);

    showToast("15% discount applied!");

  } else {

    showToast("Invalid voucher code");

  }

});

/* TOAST */

function showToast(message){

  const toast =
  document.createElement("div");

  toast.innerText = message;

  toast.style.position = "fixed";
  toast.style.bottom = "30px";
  toast.style.right = "30px";
  toast.style.padding = "15px 20px";
  toast.style.background = "#ff7ea6";
  toast.style.color = "white";
  toast.style.borderRadius = "15px";
  toast.style.zIndex = "9999";

  document.body.appendChild(toast);

  setTimeout(()=>{

    toast.remove();

  },2500);

}