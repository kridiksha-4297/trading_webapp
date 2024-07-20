//Importing dependencies:

require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const _ = require("lodash")
const mongoose = require("mongoose")
const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const multer = require("multer")
const fs = require("fs")
const path = require("path")
const favicon = require("serve-favicon")

//Setting up the modules to use them

const app = express()
app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static("public"))

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
}))

app.use(passport.initialize())
app.use(passport.session())

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

mongoose.connect("mongodb://localhost:27017/tradeDB")

//Defining Schemas:
const adminSchema = new mongoose.Schema({
    email: String,
    password: String,
})

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})

const upload = multer({ storage: storage })

adminSchema.plugin(passportLocalMongoose)

const Admin = mongoose.model("Admin", adminSchema)

passport.use(Admin.createStrategy())

passport.serializeUser(function(user, done) {
    done(null, user.id)
})

passport.deserializeUser(function(id, done) {
    Admin.findById(id).exec()
        .then(user => done(null, user))
        .catch(err => done(err, null))
})

const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    image: String,
    price: Number,
    stock: Number
})

const Product = mongoose.model("Product", productSchema)

const orderSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    contact: String,
    email: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    country: String,
    zip: String,
    items: [
        {
            productId: mongoose.Schema.Types.ObjectId,
            name: String,
            price: Number,
            quantity: Number
        }
    ],
    totalPrice: Number,
    date: { type: Date, default: Date.now }
})

const Order = mongoose.model("Order",orderSchema)

// Middleware to calculate cart item count
app.use(function (req, res, next) {
    const cart = req.session.cart || []
    res.locals.cartItemCount = cart.reduce((total, item) => total + item.quantity, 0)
    next()
})

// Check if admin user exists and create if not
async function ensureAdminUser() {
    try {
        const user = await Admin.findOne({ username: 'admin' });
        if (!user) {
            await Admin.register({ username: 'admin' }, 'admin');
            console.log('Successfully admin added!');
        } else {
            console.log('Admin user already exists.');
        }
    } catch (err) {
        console.error(err);
    }
}
ensureAdminUser()



//Routing and rendering:


app.get("/", function(req, res){
    res.render("home")
})

app.get("/login", function(req, res){
    res.render("admin-login")
})

app.get("/logout", function(req, res){
    req.logout(function(err) {
        if (err) { return next(err) }
        res.redirect("/login")
    })
})

app.get("/products", function(req, res) {

    Product.find()
    .then((foundProducts)=>{
        res.render("products", { products: foundProducts })
    })
    .catch((err)=>{
        console.log(err)
    })

})

//Route to view each Products:
app.get("/products/:productName", function(req, res){
    const requestedProduct = req.params.productName

    Product.findOne({name: requestedProduct})
        .then((foundProduct)=>{
            res.render("product",{product: foundProduct })
        })
        .catch((err)=>{
            console.log(err)
        })
})

// Route to display cart items
app.get("/cart", function(req, res) {
    const cart = req.session.cart || [] 
    res.render("cart", { cart: cart })
})

// Route to render checkout page
app.get("/checkout", function (req, res) {
    res.render("checkout", { cart: req.session.cart })
})

//Render other pages (about, contact etc)
app.get("/:renderFile", function(req, res){

    const requestFile = _.lowerCase(req.params.renderFile)
    res.render(requestFile)
})

//Admin Dashboard
app.get("/admin/dashboard", function(req,res){
    if (req.isAuthenticated()){
        Product.find()
        .then((foundProducts)=>{
            res.render("admin-dashboard", { products: foundProducts })
        })
        .catch((err)=>{
            console.log(err)
        })
    } else {
        res.redirect("/login")
    }
})

//Admin Upload
app.get("/admin/upload", function(req, res) {
    if (req.isAuthenticated()) {
        res.render("admin-upload");
    } else {
        res.redirect("/login");
    }
})

//Admin Modify
app.get("/admin/modify/:productId", function(req, res){
    if (req.isAuthenticated()){
        Product.findById(req.params.productId)
        .then((foundProduct)=>{
            res.render("admin-modify", { product: foundProduct })
        })
        .catch((err)=>{
            console.log(err)
        });
    } else {
        res.redirect("/login")
    }
})

//Admin Route to list all orders
app.get("/admin/orders", function (req, res) {
    if (req.isAuthenticated()){
        Order.find({})
        .then(orders => {
            res.render("order-history", { orders: orders });
        })
        .catch(err => {
            console.error(err);
            res.render("status", { message: "Error fetching orders." })
        });
    } else {
        res.redirect("/login")
    }
    
})

//Login form post
app.post("/login", function(req, res){

    const admin = new Admin({
        email: req.body.username,
        password: req.body.password
    })

    req.login(admin, function(err){
        if (err){
            console.log("Login Error:", err)
            res.redirect("/login")
        } else {
            passport.authenticate("local")(req, res, function(){
                console.log("Authenticated successfully!")
                res.redirect("/admin/dashboard")
            })
        }
    })
})

//Product Modify form post
app.post("/admin/modify/:productId", function(req, res){
    if (req.isAuthenticated()){
        Product.findByIdAndUpdate(req.params.productId, {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            stock: req.body.stock
        })
        .then(()=>{
            res.render("status", { message: "Successfully updated" })
        })
        .catch((err)=>{
            console.log(err)
            res.render("status", { message: "Error updating product" })
        })
    } else {
        res.redirect("/login")
    }
})

//Product add form post
app.post("/admin/upload", upload.single('productImage'), function(req, res) {
    if(req.isAuthenticated()){
        const product = new Product({
            name: req.body.name,
            description: req.body.description,
            image: '/images/' + req.file.filename, // Store the image path
            price: req.body.price,
            stock: req.body.stock
        })
    
        product.save()
            .then(() => res.render("status", { message: "Product added successfully" }))
            .catch(err => {
                console.log(err)
                res.render("status", { message: "Error adding product" })
            })
    } else {
        res.redirect("/login")
    }
    
})

//Product delete form post
app.get("/admin/delete/:productId", function(req, res){
    if (req.isAuthenticated()){
        Product.findById(req.params.productId)
            .then((foundProduct) => {
                if (foundProduct) {
                    // Delete the image file from the public/images directory
                    const imagePath = path.join(__dirname, 'public', foundProduct.image)
                    fs.unlink(imagePath, (err) => {
                        if (err) {
                            console.log(err)
                            res.render("status", { message: "Error deleting product image" })
                            return
                        }

                        // Delete the product from the database
                        Product.findByIdAndDelete(req.params.productId)
                            .then(() => {
                                res.render("status", { message: "Successfully deleted" })
                            })
                            .catch((err) => {
                                console.log(err)
                                res.render("status", { message: "Error deleting product" })
                            })
                    })
                } else {
                    res.render("status", { message: "Product not found" })
                }
            })
            .catch((err) => {
                console.log(err)
                res.render("status", { message: "Error finding product" })
            })
    } else {
        res.redirect("/login")
    }
})

//Remove a product from cart
app.post("/remove-from-cart/:productId", function(req, res) {
    const productId = req.params.productId;

    if (req.session.cart) {
        req.session.cart = req.session.cart.filter(item => item.productId !== productId)
    }

    res.redirect("/cart")
})

//Add a product to cart
app.post("/add-to-cart/:productId", function (req, res) {
    const productId = req.params.productId
    const quantity = Number(req.body.quantity)

    // Retrieve product details from database
    Product.findById(productId)
        .then(product => {
            if (!product) {
                res.render("status", { message: "Product not found" })
                return
            }

            // Initialize session cart if it doesn't exist
            req.session.cart = req.session.cart || []

            // Check if product is already in cart, update quantity if so
            let found = false;
            req.session.cart.forEach(item => {
                if (item.productId === productId) {
                    item.quantity += quantity
                    found = true
                }
            })

            // If product not in cart, add new item
            if (!found) {
                req.session.cart.push({
                    productId: productId,
                    name: product.name,
                    price: product.price,
                    quantity: quantity,
                    image: product.image
                })
            }

            res.redirect("/products/"+product.name)
        })
        .catch(err => {
            console.log(err)
            res.render("status", { message: "Error adding to cart" })
        })
})

// Route to render checkout page
app.get("/checkout", function (req, res) {
    res.render("checkout", { cart: req.session.cart })
})

// Route to process checkout
app.post("/process-checkout", function (req, res) {
    const cart = req.session.cart
    const { firstName, lastName, contact, email, address1, address2, city, state, country, zip } = req.body

    if (!cart || cart.length === 0) {
        res.render("status", { message: "Your cart is empty. Please add items to the cart before checking out." })
        return
    }

    const totalPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0)

    const order = new Order({
        firstName,
        lastName,
        contact,
        email,
        address1,
        address2,
        city,
        state,
        country,
        zip,
        items: cart,
        totalPrice
    })

    order.save()
        .then(() => {
            // Clear the cart
            req.session.cart = []

            // Render a success page
            res.render("status", { message: "Order placed successfully!" })
        })
        .catch(err => {
            console.error(err);
            res.render("status", { message: "There was an error processing your order. Please try again." })
        })
})

//Fullfill order by admin and update product stock
app.post("/admin/orders/:orderId/fulfill", function (req, res) {

    if (req.isAuthenticated()){
        const orderId = req.params.orderId

    // Find the order by ID
    Order.findById(orderId)
        .then(order => {
            if (!order) {
                throw new Error("Order not found.")
            }

            let products = order.items

            // Decrement the stock for each product in the order
            const productUpdates = products.map(item => {
                return Product.findById(item.productId)
                    .then(productDoc => {
                        if (!productDoc) {
                            throw new Error(`Product not found: ${item.productId}`)
                        }
                        productDoc.stock -= item.quantity;
                        if (productDoc.stock < 0) {
                            throw new Error(`Not enough stock for product: ${item.productId}`)
                        }
                        return productDoc.save()
                    })
            })

            // Wait for all product updates to complete
            return Promise.all(productUpdates)
                .then(() => {
                    // Delete the order after stock updates
                    return Order.deleteOne({ _id: orderId });
                });
        })
        .then(() => {
            res.redirect("/admin/orders");
        })
        .catch(err => {
            console.error(err);
            res.render("status", { message: `Error fulfilling order: ${err.message}` })
        });
    } else {
        res.redirect("/login")
    }
    
})


//Spinning the app with a port
app.listen(3000, function(){
    console.log("Server started on port 3000")
})