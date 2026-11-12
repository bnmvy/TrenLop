const express = require("express");
const app = express();
const port = 3000;
const morgan = require("morgan");
app.use(morgan("combined"));

const path = require("path");
const fs = require('fs');
app.use(express.static(path.join(__dirname, "public")));

const cors = require("cors");
app.use(cors());

const bodyParser = require("body-parser");
app.use(bodyParser.json({ limit: '50mb' })); 
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Tạo API mặc định
app.get("/", (req, res) => {
    res.send("Hello Restful API");
});

app.listen(port, () => {
    console.log(`My Server listening on port ${port}`);
});

let database = [
    {"BookId":"b1","BookName":"Kỹ thuật lập trình cơ bản","Price":70,"Image":"b1.png"},
    {"BookId":"b2","BookName":"Kỹ thuật lập trình nâng cao","Price":100,"Image":"b2.png"},
    {"BookId":"b3","BookName":"Máy học cơ bản","Price":200,"Image":"b3.png"},
    {"BookId":"b4","BookName":"Máy học nâng cao","Price":300,"Image":"b4.png"},
    {"BookId":"b5","BookName":"Lập trình Robot cơ bản","Price":250,"Image":"b5.png"},
];

app.get("/books", (req, res) => {
    res.send(database);
});

app.get("/books/:id", cors(), (req, res) => {
    let id = req.params["id"];
    let p = database.find(x => x.BookId == id);
    res.send(p);    
});

// API Lọc sách theo khoảng giá (min/max)
app.get("/books/filter/price", cors(), (req, res) => {
    let minPrice = req.query.min;
    let maxPrice = req.query.max;
    
    if (!minPrice || !maxPrice) {
        return res.status(400).send("Vui lòng cung cấp đầy đủ tham số ?min=...&max=...");
    }
    
    let min = parseFloat(minPrice);
    let max = parseFloat(maxPrice);
    let filteredBooks = database.filter(x => x.Price >= min && x.Price <= max);
    
    res.send(filteredBooks);
});

// API Thêm sách mới (có hỗ trợ lưu ảnh từ Base64)
app.post("/books", cors(), (req, res) => {   
    let newBook = req.body;
    
    // Hứng cả 2 trường hợp viết hoa hoặc viết thường để tránh bị undefined
    const bookId = newBook.BookId || newBook.BookID;
    if (bookId) {
        newBook.BookId = bookId;
    }

    if (newBook.ImageBase64 && newBook.ImageBase64.startsWith("data:image")) {
        const base64Data = newBook.ImageBase64.replace(/^data:image\/\w+;base64,/, "");
        const fileName = `${newBook.BookId}.png`;
        const destPath = path.join(__dirname, 'public', 'images', fileName);
        
        try {
            fs.writeFileSync(destPath, base64Data, 'base64');
            newBook.Image = fileName;
        } catch (error) {
            return res.status(500).send("Lỗi lưu ảnh Base64");
        }
        delete newBook.ImageBase64;
    }
    
    database.push(newBook);
    res.send(database);
});
app.put("/books", cors(), (req, res) => {
    let updatedBook = req.body;
    // 1. Find the index of the book to update in the array
    const index = database.findIndex(x => x.BookId === updatedBook.BookId);
    // If the book is not found, return a 404 error
    if (index === -1) {
        return res.status(404).send("Book not found!");
    }
    // 2. Check if the Client sent a new image
    if (updatedBook.ImageBase64) {
        // Has new image -> Overwrite the image file (like POST)
        const base64Data = updatedBook.ImageBase64.replace(/^data:image\/\w+;base64,/, "");
        const fileName = `${updatedBook.BookId}_${Date.now()}.png`;
        const destPath = path.join(__dirname, 'public', 'images', fileName);        
        try {
            // This function will automatically overwrite the old .png file if it exists
            fs.writeFileSync(destPath, base64Data, 'base64');
            updatedBook.Image = fileName;
        } catch (error) {
            return res.status(500).send("Error saving Base64 image!");
        }        
        // Delete the base64 string to save memory
        delete updatedBook.ImageBase64;
    } 
    else {
        // NO new image -> Keep the old image name from the database
        updatedBook.Image = database[index].Image;
    }
    // 3. Overwrite the new data at the correct index
    database[index] = updatedBook;
    // 4. Return the book list so Angular can update the UI
    res.send(database);
});
app.delete("/books/:id", cors(), (req, res) => {
    id=req.params["id"]
    database=database.filter(x=>x.BookId!=id)
    res.send(database)
})