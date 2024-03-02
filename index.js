const express = require('express');
const { Deta } = require("deta");
require('babel-polyfill');
var brandedQRCode = require('branded-qr-code');
var AdmZip = require('adm-zip');
var bodyParser = require('body-parser');
const dataKEY = "b0z61Ay7aZUy_EB8xyjVZ4BZMJvq7itEVKNHjWaPqK3jq"
const app = express();
const deta = Deta(dataKEY);
const PARADISE_KEY = "PARADISE-3214_"
const LANTERN_KEY = "PARADISE-3214_"
const db = deta.Base('points2');
const children = deta.Base('children');
const users = deta.Base('users');
const fs = require('fs');
const cors = require('cors') 
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
app.use(express.json());
let corsOptions = { 
  origin : '*', 
} 

app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json()); 
app.use(cors(corsOptions))
// Endpoint to add data to the database
const generateRandomKey = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let key = '';
    for (let i = 0; i < 30; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        key += characters[randomIndex];
    }
    return `user_${key}`;
};
async function pullAllPoints() {

    let res = await db.fetch();
    let allItems = res.items;

    // Continue fetching until "res.last" is undefined.
    while (res.last) {
      res = await db.fetch({}, { last: res.last });
      allItems = allItems.concat(res.items);
    }

    console.log("all data for points is", allItems)
    return allItems;
}
async function pullAllUsers() {

    let res = await users.fetch();
    let allItems = res.items;

    // Continue fetching until "res.last" is undefined.
    while (res.last) {
      res = await users.fetch({}, { last: res.last });
      allItems = allItems.concat(res.items);
    }

    console.log("all data is", allItems)
    return allItems;
}
async function pullAllChildren() {

    let res = await children.fetch();
    let allItems = res.items;

    // Continue fetching until "res.last" is undefined.
    while (res.last) {
      res = await children.fetch({}, { last: res.last });
      allItems = allItems.concat(res.items);
    }

    console.log("all children is", allItems)
    return allItems;
}
async function findKey(obj) {
    console.log("starting search")
    const allData = await pullAllUsers();
    console.log("pulled all users")
  
    const user = allData.find(user => user.email === obj.email && user.password === obj.password);
    if (user === undefined) {
        return null;
    }
    return user.key;
}
// Endpoint to store data in the database
app.post("/create-little-lantern", async(req, res) => {
    let data = req.body;
  if (data.gender === undefined || data.age === undefined || data.fullname === undefined || data.grade === undefined || data.pottyTrained === undefined || data.primaryGuardianNumber === undefined  ) {
      return res.status(400).json({ error: 'Invalid data format' });
  }
    const userKey = data.fullname;
    //check if key already exists in database
    let check = await children.get(userKey);
    if (check !== null && data.update === undefined) {
        return res.status(400).json({ error: 'Child already exists', status: 'failed'});
    }
  if (!(data.update === undefined)) {
    //updating mode
    delete data.update;
    
  }
    data = {...data, isChecked: false};
    await children.put(data, userKey);
    res.status(200).json({ message: 'Child created successfully', userKey, status: 'success'});
})
app.post("/get-children-for-user", async(req, res) => {
  let data = req.body;
  if (data.email === undefined) {
      return res.status(400).json({ error: 'Invalid data format' });
  }
  const userKey = data.email;
  //check if key already exists in database
  let check = await pullAllChildren();
  let userChildren = check.filter(child => child.parentName === userKey);
  if (userChildren === null || userChildren.length === 0) {
      return res.status(400).json({ error: 'User does not have any children', status: 'failed'});
  }
  res.status(200).json({ message: 'Children found successfully', userChildren, status: 'success'});

}
)
app.post("/check-in-child", async(req, res) => {
    let data = req.body;
    if (data.fullname === undefined) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    const userKey = data.fullname;
    //check if key already exists in database
    let check = await children.get(userKey);
    if (check === null) {
        return res.status(400).json({ error: 'Child does not exist', status: 'failed'});
    }
    check.isChecked = true;
    await children.put(check, userKey);
    res.status(200).json({ message: 'Child checked in successfully', userKey, status: 'success'});
})

app.post("/check-out-child", async(req, res) => {
    let data = req.body;
    if (data.fullname === undefined) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    const userKey = data.fullname;
    //check if key already exists in database
    let check = await children.get(userKey);
    if (check === null) {
        return res.status(400).json({ error: 'Child does not exist', status: 'failed'});
    }
 if (check.isChecked != true) {
    return res.status(400).json({ error: 'Child is not checked in', status: 'failed'});
    
  }

    check.isChecked = false;
    await children.put(check, userKey);
    res.status(200).json({ message: 'Child checked out successfully', userKey, status: 'success'});
})


app.post("/get-checked-in-children", async(req, res) => {
    let data = req.body;
    if (data.email === undefined) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    if (data.role !== "admin") {
        return res.status(400).json({ error: 'Invalid data format' });
        }

    //check if key already exists in database
    let check = await pullAllChildren();
    let userChildren = check.filter(child => child.isChecked === true);
    if (userChildren === null || userChildren.length === 0) {
        return res.status(400).json({ error: 'No Children are checked in', status: 'failed'});
    }
    res.status(200).json({ message: 'Children found successfully', userChildren, status: 'success'});

    })

app.post('/store-db-data', async (req, res) => {
    try {
        const key = Object.keys(req.body)[0];
        const data = req.body[key];

      

        await db.put(data, key);
        console.log("Data stored in the database", data, key);
        res.status(200).json({ message: 'Data stored in the database' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to store data in the database' });
    }
});
app.post('/create-qr', async(req, res) => {
  console.log(req.body)


  try {
    const strings  = req.body.namesArray;
    var zip = new AdmZip();
    if (!Array.isArray(strings) || strings === undefined || strings?.length === 0) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

async function createCodes() {
  return new Promise(async (resolve, reject) => {
      for (let i = 0; i < strings.length; i++) {
          const str = strings[i];

          const buf = await brandedQRCode.generate({
            text: `PARADISE-3214_${str}`,
            path: __dirname + '/splash.png',
            ratio: 1.6,
            opt: { errorCorrectionLevel:  'H', margin: 2, width: 1600},
          });

          const image = await loadImage(buf);

          const canvas = createCanvas(image.width, image.height + 200);
          const context = canvas.getContext('2d');

          context.drawImage(image, 0, 0, image.width, image.height);

          context.fillStyle = 'black';
          context.fillRect(0, image.height, canvas.width, 200);

          context.fillStyle = 'white';
          context.textAlign = 'center';
          context.font = '90px "Arial"';
          context.fillText(str, canvas.width / 2, image.height + 130);

          const out = fs.createWriteStream(path.resolve(__dirname, `./output/${str}.png`));
          const stream = canvas.createPNGStream();
          stream.pipe(out);
          out.on('finish', () => {
              console.log('The PNG file was created.')
              zip.addLocalFile(`./output/${str}.png`);
              if (i === strings.length - 1) {
                  resolve();
              }
          });
      }
  });
}
   await createCodes();
  zip.addLocalFile(`./output/${strings[strings.length-1]}.png`);
  console.log("finished making all pngs")
  res.setHeader('Content-disposition', 'attachment; filename=' + 'codes.zip');
  res.setHeader('Content-type', 'application/zip');
  zip.toBufferPromise().then((buffer) => {
      res.send(buffer);
//delete files in output folder
    const files = fs.readdirSync('./output');
    files.forEach((file) => {
        fs.unlinkSync(`./output/${file}`);
    });
  })
  /** 
  //log when writing zip finishes
  console.log("finished writing zip")
  res.setHeader('Content-disposition', 'attachment; filename=' + 'codes.zip');
  res.setHeader('Content-type', 'application/zip');
  res.download(path.resolve(__dirname, `./output/codes.zip`), (err) => {
      if (err) {
          res.status(500).send('Error downloading the file.');
      } else {
          console.log('File downloaded successfully.');
          // Delete the zip file after it's sent
          for (let i = 0; i < strings.length; i++) {
              fs.unlinkSync(path.resolve(__dirname, `./output/${strings[i]}.png`));
          }
          fs.unlinkSync(path.resolve(__dirname, `./output/codes.zip`));

      }
  });
  console.log(res.header, res.headersSent)
*/


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create QR codes' });
  }

});
// Endpoint to delete data from the database
app.post('/delete-db-data', async (req, res) => {
    try {
        if (!Array.isArray(req.body)) {
            throw new Error('Invalid data format');
        }

        console.log(req.body[0])
        await db.delete(req.body[0]);
        res.status(200).json({ message: 'Data deleted from the database' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete data from the database' });
    }
});

// Endpoint to get data from the database
app.post('/get-db-data', async (req, res) => {
    try {
      console.log(req.body)
        if (!Array.isArray(req.body)) {
            throw new Error('Invalid data format');
        }

        const data = req.body[0]

        const item = await db.get(data);
      console.log("item is", item)
        res.status(200).json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get data from the database' });
    }
});

app.get('/get-leaderboard', async (req, res) => {
    try {
        let allData = await db.fetch();
        let leaderboardData = allData.items.filter(item => item.points !== undefined);
        let gradeGroup1 = [];
        let gradeGroup2 = [];
        let gradeGroup3 = [];
        leaderboardData.forEach(item => {
            if (item.gradeGroup === "1") {
                gradeGroup1.push(item);
            } else if (item.gradeGroup === "2") {
                gradeGroup2.push(item);
            } else if (item.gradeGroup === "3") {
                gradeGroup3.push(item);
            }
        });
        gradeGroup1.sort((a, b) => b.points - a.points);
        gradeGroup2.sort((a, b) => b.points - a.points);
        gradeGroup3.sort((a, b) => b.points - a.points);
        gradeGroup1 = gradeGroup1.slice(0, 10);
        gradeGroup2 = gradeGroup2.slice(0, 10);
        gradeGroup3 = gradeGroup3.slice(0, 10);
        leaderboardData = [gradeGroup1, gradeGroup2, gradeGroup3];

        res.status(200).json(leaderboardData);
    }  catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get leaderboard data from the database' });
    }
});
app.post('/create-single-lantern-qr', async(req, res) => {
  console.log(req.body)

                if (req.body.name === undefined || req.body.name === null || req.body.name === '') {
                   return res.status(400).json({ error: 'Invalid data format' });
                }
                const str = req.body.name;

                const buf = await brandedQRCode.generate({
                  text: `Lantern-3214_${str}`,
                  path: __dirname + '/splash.png',
                  ratio: 1.6,
                  opt: { errorCorrectionLevel:  'H', margin: 2, width: 1600},
                });

                const image = await loadImage(buf);

                const canvas = createCanvas(image.width, image.height + 200);
                const context = canvas.getContext('2d');

                context.drawImage(image, 0, 0, image.width, image.height);

                context.fillStyle = 'black';
                context.fillRect(0, image.height, canvas.width, 200);

                context.fillStyle = 'white';
                context.textAlign = 'center';
                context.font = '90px "Arial"';
                context.fillText(str, canvas.width / 2, image.height + 130);

  const stream = canvas.createPNGStream(); // Create PNG stream from canvas

  res.setHeader('Content-Type', 'image/png'); // Set response header to indicate PNG content
  stream.pipe(res); // Pipe the PNG stream to the response object




})
app.post('/create-single-qr', async(req, res) => {
  console.log(req.body)

                if (req.body.name === undefined || req.body.name === null || req.body.name === '') {
                   return res.status(400).json({ error: 'Invalid data format' });
                }
                const str = req.body.name;

                const buf = await brandedQRCode.generate({
                  text: `PARADISE-3214_${str}`,
                  path: __dirname + '/splash.png',
                  ratio: 1.6,
                  opt: { errorCorrectionLevel:  'H', margin: 2, width: 1600},
                });

                const image = await loadImage(buf);

                const canvas = createCanvas(image.width, image.height + 200);
                const context = canvas.getContext('2d');

                context.drawImage(image, 0, 0, image.width, image.height);

                context.fillStyle = 'black';
                context.fillRect(0, image.height, canvas.width, 200);

                context.fillStyle = 'white';
                context.textAlign = 'center';
                context.font = '90px "Arial"';
                context.fillText(str, canvas.width / 2, image.height + 130);

  const stream = canvas.createPNGStream(); // Create PNG stream from canvas

  res.setHeader('Content-Type', 'image/png'); // Set response header to indicate PNG content
  stream.pipe(res); // Pipe the PNG stream to the response object




})
app.post('/create-user', async (req, res) => {
    try {
        if (typeof req.body !== 'object') {
           return res.status(400).json({ error: 'Invalid data format', status: 'failed'});
        }
        let data = req.body;
        if (data.fullname === undefined || data.email === undefined || data.password === undefined) {
          return  res.status(400).json({ error: 'Invalid data format', status: 'failed'});
        }
        data.email = data.email.toLowerCase()
        data = {...data, role: 'user', paradiseAccess: false};
        const userKey = data.email;
        //check if key already exists in database
        let check = await users.get(userKey);
        if (check !== null) {
            return res.status(400).json({ error: 'User already exists', status: 'failed'});
        }
        await users.put(data, userKey);
        res.status(200).json({ message: 'User created successfully', userKey, status: 'success'});

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get data from the database', status: 'failed'});
    }
})
app.post("/create-paradise-account", async(req, res) => {
    const data = req.body;
    if (data.email === undefined || data.password === undefined || data.fullname === undefined) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    const userKey = data.email;
    //check if key already exists in database
    let check = await users.get(userKey);
    let allPoints = await pullAllPoints();
    let paradiseCheck = allPoints.find(user => user.key === data.fullname);
    if (paradiseCheck == null) {
        return res.status(400).json({ error: 'User does not exist in paradise database', status: 'failed'});
    }
    if (check == null) {
        return res.status(400).json({ error: 'User already exists', status: 'failed'});
    }
    check.paradiseAccess = true;
    await users.put(check, userKey);
    res.status(200).json({ message: 'Account created successfully', userKey, status: 'success'});
})
app.post('/get-user-key', async (req, res) => {
    try {
        if (typeof req.body !== 'object') {
           return res.status(400).json({ error: 'Invalid data format', status: 'failed'});
        }
        const data = req.body;
        if (data.email === undefined || data.password === undefined) {
          return  res.status(400).json({ error: 'Invalid data format', status: 'failed'});
        }
        const key = await findKey(data);
        if (key === null) {
            return res.status(404).json({ error: 'User not found', status: 'failed'});
        }


        res.status(200).json({ message: 'User found', userKey: key, status: 'success'});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get data from the database', status: 'failed'});
    }
})
app.post('/get-paradise-key', async (req, res) => {
    try {

        res.status(200).json(PARADISE_KEY);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get paradise key' });
    }
});

app.get('/', function(req, res){
res.sendFile(__dirname + '/index.html');
});
app.post('/login', async (req, res) => {
    try {
        if (typeof req.body !== 'object') {
           return res.status(400).json({ error: 'Invalid data format', status: 'failed'});
        }
        const data = req.body;
        if (data.email === undefined || data.password === undefined) {
          return  res.status(400).json({ error: 'Invalid data format', status: 'failed'});
        }
        const userData = await users.get(data.email.toLowerCase());


        if (userData === undefined || userData === null) {
            return res.status(404).json({ error: 'User not found', status: 'failed'});
        }
      if (!(userData.password === data.password)) {
        return res.status(404).json({ error: 'User not found', status: 'failed'});
      }
        res.status(200).json({ message: 'User logged in successfully', userData: userData, status: 'success'});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get data from the database', status: 'failed'});
    }
})


// Endpoint to get data from the database


// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});