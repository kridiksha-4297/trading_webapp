# Trading/E-commerce Web Application (v1.0)

<p>This is a fully functional, ready-to-use e-commerce web application. It is based on a guest user approach, allowing only admins to log in. Temporary sessions are created for guest users. As an admin, you can upload, modify, or delete the listed products and track details of previous orders.</p>

<p><strong>Note:</strong> Implement your payment gateway after the checkout page when the user clicks "Proceed to Pay."</p>

## Requirements/Tech Stack Used

<ul>
  <li><strong>Node.js</strong></li>
  <li><strong>Express</strong></li>
  <li><strong>Passport</strong></li>
  <li><strong>MongoDB</strong></li>
</ul>

<p><strong>Note:</strong> Make sure to install and set up node and MongoDB to use this application.</p>

## Instructions to Use

<ol>
  <li>Pull the repository:
    <pre><code>git clone &lt;repository-url&gt;</code></pre>
  </li>
  <li>Install all dependencies:
    <pre><code>npm install</code></pre>
  </li>
  <li>Create a <code>.env</code> file and set a secret:
    <pre><code>SECRET=&lt;your secret key&gt;</code></pre>
  </li>
  <li>Make sure to run the MongoDB server:
    <pre><code>mongod</code></pre>
  </li>
  <li>Run the application:
    <pre><code>node app.js</code></pre>
  </li>
  <li>Go to <code>localhost:3000</code> and explore</li>
</ol>

<p><strong>Note:</strong> By default, the admin username and password are "admin" and "admin". You can change, modify, or add new admins from the appropriate section of the code in <code>app.js</code>.</p>

