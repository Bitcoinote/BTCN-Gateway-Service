# Form Submit Functionality

The recommended way to create transactions is using the REST API.

However, payment initiation through form submission is also supported.

Note that this functionality is only available if `ALLOW_FORM_SUBMIT` is set to `1` in the `.env` file. In the admin, there is a link `Test Form` at the bottom which will show a page with a demo form.

To initiate a transaction, an unauthenticated HTTP POST request to the endpoint `/pay` can be sent, with the same parameters in the body which the "Create Transaction" endpoint described in the [API Reference](api-reference.md) would take. The server will respond with a redirect to the payment funnel page (`statusUrl`) of the newly created transaction.

When sent from a form, this naturally has the following drawbacks:

* Your server won't know about this transaction until it receives an IPN upon successful payment or the user reaches the success/error redirection.
* The user is able to see and modify the parameters used for transaction creation (e.g. by using the browser's developer tools). This means you have to take extra care when validating the transaction at the end.
* It is not possible to set the `customData` to something other than a string.

Still, this can be a valid and simple way to implement certain simple forms of checkout flows. For example, you might sell an ebook on your website.

You could then place a form with hidden fields that specify the price and description for the payment as well as redirect URLs and place a "Buy" button which submits this form. The user would then be able to pay with BTCN, and when they are done, you could react on the success redirection by verifying the transaction with a request to the API and checking that the amount is valid and then give the user access to downloading the eBook.

Or even simpler, you would ask the user to specify their email address and send it as `customData`, and implement an IPN endpoint which validates the amount and then sends the eBook to the customer.

This way, you don't have to keep any state on the server.

## Example

The ebook form from the above example could look like this:

```html
<form action="http://example.com:38071/pay" method="POST">
  <input type="hidden" name="amount" value="9.99">
  <input type="hidden" name="currency" value="USD">
  <input type="hidden" name="description" value="Cool eBook about Cats">
  <input type="hidden" name="ipnUrl" value="http://example.com/shop/ebook-ipn">
  <input type="hidden" name="successRedirectUrl" value="http://example.com/shop/thank-you">
  <input type="hidden" name="errorRedirectUrl" value="http://example.com/shop">
  <input type="hidden" name="allowUserCancel" value="1">

  <h1>Cool eBook about Cats - only $9.99!</h1>
  Enter your email address: <input type="email" name="customData" required>
  <button type="submit">Buy with BitcoiNote</button>
</form>
```

The IPN handler `http://example.com/shop/ebook-ipn` could be implemented like this (PHP example code):

```php
define('IPN_SECRET', 'secretKeyGoesHere');

// ...

$rawBody = file_get_contents("php://input");
$transaction = json_decode($rawBody);
$expectedSignature = hash_hmac('sha256', $rawBody, IPN_SECRET);

if ($_SERVER['HTTP_X_IPN_SIGNATURE'] != $expectedSignature) {
  die('Invalid signature');
} else if ($transaction->amount != 9.99 || $transaction->currency != 'USD') {
  die('Invalid payment');
} else {
  $email = $transaction->customData;
  sendEBookToCustomer($email);
}

```

_Note: If your website uses SSL, you will run into issues with submitting a form to a non-SSL website. In this case, it's recommended to run the gateway behind a reverse proxy that handles SSL, e.g. Caddy, an Amazon Elastic Load Balancer or Amazon CloudFront._

-----

Continue reading: [Admin Interface](admin-interface.md)

[Back to Documentation Overview](index.md)
