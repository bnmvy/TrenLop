const jwt = require('jsonwebtoken');
const SECRET_KEY = "MY_SUPER_SECRET_KEY"; // Khóa bí mật dùng để ký và giải mã token

const express = require('express');
const app = express();
const port = 3002;

const morgan=require("morgan")
app.use(morgan("combined"))

const path=require("path")
const fs = require('fs');
app.use(express.static(path.join(__dirname,"public")))

const cors=require("cors")
app.use(cors({
    origin: 'http://localhost:4200', 
    credentials: true
}));
const cookieParser = require('cookie-parser');
app.use(cookieParser());

const bodyParser=require("body-parser")
app.use(bodyParser.json({ limit: '50mb' })); 
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.listen(port,()=>{
    console.log(`My Server listening on port ${port}`)
})

app.get("/",(req,res)=>{
    res.send("This Web server is processed for MongoDB")
})
const { MongoClient, ObjectId } = require('mongodb');
const { log } = require('console');
const crypto = require('crypto');
client = new MongoClient("mongodb://127.0.0.1:27017");
client.connect();
database = client.db("FashionData");      
fashionCollection = database.collection("Fashion");

// --- MIDDLEWARE KIỂM TRA BEARER TOKEN ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    const token = req.cookies?.access_token || bearerToken;

    if (!token) {
        return res.status(401).send({ message: "Không tìm thấy Token, truy cập bị từ chối!" });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: "Token không hợp lệ hoặc đã hết hạn!" });
        }
        req.user = decoded; // Lưu thông tin user đã giải mã vào request
        next();
    });
};

app.get("/fashions",cors(),async (req,res)=>{   
    const result = await fashionCollection.find({}).toArray();
    res.send(result)
    }
)

app.get("/fashions/:id",cors(),async (req,res)=>{
    var o_id = new ObjectId(req.params["id"]);
    const result = await fashionCollection.find({_id:o_id}).toArray();    
    res.send(result[0])
    }
)

// Ví dụ nếu muốn bảo vệ API thêm sản phẩm bằng Bearer Token, bạn chỉ cần thêm verifyToken vào giữa:
app.post("/fashions", cors(), verifyToken, async(req, res) => {   
    await fashionCollection.insertOne(req.body);
    res.send(req.body);
})

app.put("/fashions", cors(), verifyToken, async(req,res)=>{       
    await fashionCollection.updateOne(
        {_id:new ObjectId(req.body._id)},
        { $set: { 
                style: req.body.style,
                fashion_subject:req.body.fashion_subject,
                fashion_detail:req.body.fashion_detail,
                fashion_image:req.body.fashion_image
            } 
        }
        )
    var o_id = new ObjectId(req.body._id);
    const result = await fashionCollection.find({_id:o_id}).toArray();    
    res.send(result[0])
})

app.delete("/fashions/:id", cors(), verifyToken, async(req,res)=>{   
    var o_id = new ObjectId(req.params["id"]);
    const result = await fashionCollection.find({_id:o_id}).toArray(); 
    await fashionCollection.deleteOne(
        {_id:o_id}
        )
    res.send(result[0])
})

app.post('/user-login', async (req, res) => {
    const { username, password, rememberMe } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).send({ message: "Username and password are required." });
    }

    const UserCollection = database.collection("User");
    const user = await UserCollection.findOne({ username });
    const hashedPassword = crypto.createHash('sha256').update(password, 'utf8').digest('hex');
    const storedPassword = user?.password;
    const isSha256Hash = typeof storedPassword === 'string' && /^[a-f0-9]{64}$/i.test(storedPassword);
    const passwordToCompare = isSha256Hash ? storedPassword.toLowerCase() : storedPassword;
    const expectedPassword = isSha256Hash ? hashedPassword : password;
    const passwordMatches = typeof passwordToCompare === 'string'
        && Buffer.byteLength(passwordToCompare, 'utf8') === Buffer.byteLength(expectedPassword, 'utf8')
        && crypto.timingSafeEqual(
            Buffer.from(passwordToCompare, 'utf8'),
            Buffer.from(expectedPassword, 'utf8')
        );

    if (!user || !passwordMatches) {
        res.status(401).send({ message: "Wrong user or email!" });
        return;
    }   

    if (!isSha256Hash) {
        await UserCollection.updateOne(
            { _id: user._id, password: storedPassword },
            { $set: { password: hashedPassword } }
        );
    }

    // 👉 TẠO JWT BEARER TOKEN (Hạn sử dụng trong 1 ngày)
    const accessToken = jwt.sign(
        { username: user.username, role: user.role }, 
        SECRET_KEY, 
        { expiresIn: '1d' }
    );

    res.cookie('access_token', accessToken, {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
    });
    res.clearCookie('remember_password');
    if (rememberMe) {
        res.cookie('remember_user', username, {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax'
        });
    } else {
        res.clearCookie('remember_user');
    }
    
    res.status(200).send({
        message: "Login successful!",
        user: { username: user.username, role: user.role }
    });
});

app.get('/user-session', verifyToken, (req, res) => {
    res.status(200).send({
        user: { username: req.user.username, role: req.user.role }
    });
});