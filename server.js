const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Serve static files (HTML, CSS, JavaScript)
app.use(express.static(path.join(__dirname, 'public')));

app.post('/convert', upload.single('cert'), (req, res) => {
    const p12InputPath = req.file.path;
    const p12OutputPath = path.join('uploads', 'converted.p12');
    const privateKeyPem = path.join('uploads', 'private_key.pem');
    const certificatePem = path.join('uploads', 'certificate.pem');
    const pemFilePath = path.join('uploads', 'certificate.pem'); // Define pemFilePath here

    const password = req.body.password || '';
    const originalFileName = req.file.originalname;

    const generateCRTCmd = `openssl pkcs12 -in ${p12InputPath} -clcerts -nokeys -out ${certificatePem} -password pass:${password}`;
    const generateKEYCmd = `openssl pkcs12 -in ${p12InputPath} -nocerts -out ${privateKeyPem} -nodes -password pass:${password}`;
    const generatePEMCmd = `openssl x509 -pubkey -in ${certificatePem} -outform PEM -out ${pemFilePath}`;
    const convertToOpenSSL300Cmd = `openssl pkcs12 -export -certpbe PBE-SHA1-3DES -keypbe PBE-SHA1-3DES -nomac -inkey ${privateKeyPem} -in ${certificatePem} -out ${p12OutputPath} -passout pass:${password}`;

    exec(generateCRTCmd, (err) => {
        if (err) {
            console.error('Error generating CRT:', err);
            return res.status(500).send('Error generating CRT');
        }

        exec(generateKEYCmd, (err) => {
            if (err) {
                console.error('Error generating KEY:', err);
                return res.status(500).send('Error generating KEY');
            }

            exec(generatePEMCmd, (err) => {
                if (err) {
                    console.error('Error generating PEM:', err);
                    return res.status(500).send('Error generating PEM');
                }

                exec(convertToOpenSSL300Cmd, (err) => {
                    if (err) {
                        console.error('Error converting to OpenSSL 3.0.0:', err);
                        return res.status(500).send('Error converting to OpenSSL 3.0.0');
                    }

                    res.download(p12OutputPath, originalFileName, (err) => {
                        if (err) {
                            console.error('Error sending file:', err);
                            return res.status(500).send('Error sending file');
                        }

                        // Cleanup
                        fs.unlinkSync(p12InputPath);
                        fs.unlinkSync(privateKeyPem);
                        fs.unlinkSync(certificatePem);
                        fs.unlinkSync(p12OutputPath);
                    });
                });
            });
        });
    });
});


// Define a fallback route for all other requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
