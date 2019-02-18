# Amazon EC2 Instance Setup Instructions

If you don't have a server with Ubuntu 16+ ready, you can follow these steps.

This section describes how to set up an Amazon EC2 instance to host the gateway. (Of course, you can also use any other hosting provider which offers a similar service.)

If you don't have an account at [Amazon Web Services](https://aws.amazon.com/) yet, create one.

The configuration below is recommended. Expected cost is around $10 per month. The free tier configuration is not recommended as it may lead to memory usage issues.

1. Log in to your Amazon Console.
2. Go to Services -> EC2.
3. Go to "Instances" and click "Launch Instance".
4. Select "Ubuntu Server 18.04 LTS (HVM), SSD Volume Type".
5. Select `t2.small` as instance type. Click "Next: Configure Instance Details".
6. Enable "T2/T3 Unlimited". Click "Next: Add Storage".
7. Set the size to 25 GB. Click "Next: Add Tags".
8. Click "click to add a Name tag" and enter a name for the server (e.g. "BTCNGateway"). Click "Next: Configure Security Group".
9. Click "Add Rule". In the new row, set "Port Range" to `38071` and change "Source" to "Anywhere". Click "Review and Launch".
10. Click "Launch".
11. Select a key pair if you already have one, otherwise enter a key pair name (e.g. "gateway") and click "Download Key Pair". You need this to connect to the server! Click "Launch Instances".
12. Click "View Instances" and look for the instance which was just created.
13. Note down the "Public IP".

Then, go to your DNS provider's control panel and add a subdomain for the gateway to your shop domain, for example `pay.example.com` if your shop domain is `example.com`. Set an `A` record pointing to the IP which you just wrote down.

You now have to connect to the instance which you just started, using the key pair.

If you are using Windows, you would need to follow these steps:

1. Download and install [PuTTY](https://www.putty.org/).
2. Download and install [WinSCP](https://winscp.net/eng/download.php).
3. Start PuTTYgen from the start menu. (We have to convert the `pem` file to `ppk` with it.)
4. Click Conversions -> Import Key.
5. Select the `pem` file which you downloaded from AWS before.
6. Specify a filename for the new `ppk` file to save.
7. Open WinSCP.
8. Make sure protocol is set to "SFTP". Enter the domain name as hostname (or IP if you didn't set up a domain name) and `ubuntu` as username (password is empty). Then click "Advanced" and select "SSH" -> "Authentication" and use the "..." button to select the `ppk` file which you just created.
9. Save the host for future usage.

Once you connected to the server via SFTP (which you will need to transfer the wallet file later), you can click the button with the icon of two computers and a flash, or press `Ctrl+P`, to open PuTTY in order to run commands on the server.

Now continue with the automatic setup script in the [Quick Start Guide](quick-start.md)!

-----

Continue reading: [Quick Start Guide](quick-start.md)

[Back to Documentation Overview](index.md)
