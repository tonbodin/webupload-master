# README.md for BI Data Upload Web Application
--------------------------------------------------------------------------------------------------------------------------

[5/7 Presentation Link](https://bondintelligence-my.sharepoint.com/:v:/g/personal/rishi_bondintelligence_us/EQ7sjW_e-4VFh8BpZxcMxwkBoWM3tcx3BnFkPTL09W8oAQ?e=DzoK8W)

### File structure
#### Folders:
- **node_modules** - this folder contains all of the packages needed for the application.
- **client** - this folder contains both of the static frontend HTML/CSS pages, as well as sample image and CSV files for testing purposes.
- **z. OLDFILES_storedjustincase** - this contains an old version of the project. Just saved it in case I need to go back later.
#### Files:
- **archive.js** - this is a file that contains past blocks of code which may be needed later, but not at the moment.
- **index.js** - this is the most critical file for the entire application. It is the backend for the web application, and processes the form on the front page as well as the files.
- **package-lock.json** - this contains details for all of the installed packages in the application.
- **package.json** - this is like an "About Me" file for the application. All Node.js web applications have a version of this file, containing important general details about the project.
- **README.md** - this is the file you are reading right now. It's a place to express information about the project in plain English.
- **sample.json** - an example of what a JSON file would look like after filling out the form on the front page of the application. Stored for development purposes.
- **test.js** - this is an extra file created solely for the purpose of testing small bits of code.

--------------------------------------------------------------------------------------------------------------------------

### Prerequisites for running locally:
1. Install the latest version of Node.js (https://nodejs.org/en/download/). This will install Node.js as well as Node Package Manager (npm).
2. Install the necessary npm dependencies for the project by running the following text in the command line: `npm install`.
3. Install Visual Studio Code (https://code.visualstudio.com/). This IDE is optimized for web development and working with Microsoft Azure. 

### Running locally:
1. Clone this repository in command line.
2. Use `cd` to navigate into the project folder.
3. Run `node index.js`.
4. In order for the application to run locally, find the two spots where it says `rishi@bondintelligence.us`, and replace it with your own Bond Intelligence email. Keep your email within the single quotes. <br>
Additionally, find the line that says `var transporter = nodemailer.createTransport({`. In the empty spot where it says `pass:`, enter the password for your Bond Intelligence account. <br> 
It's important to use Bond Intelligence credentials only, as the authentication process to send the confirmation email will fail otherwise. If you did this correctly, the block of code should be formatted like this: <br>
```
var transporter = nodemailer.createTransport({
    service: 'outlook',
    auth: {
        user: 'sample.email@bondintelligence.us',
        pass: 'sample-password123!'
    }
});
```
5. Go to `http://localhost:5000/` in your web browser. This is where you can interact with a local version of the web application. Fill out the fields on the form with some sample values. If you need a sample image and/or CSV, you can find them in the 'client' folder within the project repository. After clicking "Upload", you will be taken to a confirmation page, and a confirmation email will be sent to the address that you specified in the form. To see the result of uploading the text and files, navigate to the `selfupload` storage account in the Azure portal for Bond Intelligence. Go into `container1` and you will see the selected CSV and image file, as well as a JSON file containing the contents of the three text fields from the HTML form.

### Stopping a local host after running it:
1. Make sure you are still in the project folder in the command line.
2. Type control+C in the command line. This will stop the Node server.

### What I'm currently working on
Researching one of the following two paths
- EITHER: figuring out how to query the uploaded files from the Azure storage account directly to the OpenData dashboards <br>
- OR: pipelining the files into a SQL database from the Blob storage
  

### What I'll be working on next
- Hosting the Node.js web application on Azure
- Adding a security layer to ensure that only images and CSVs can be uploaded to the application in the file fields (for now there is no way of enforcing this)
- Accounting for other image formats besides PNG (JPEG, etc.)