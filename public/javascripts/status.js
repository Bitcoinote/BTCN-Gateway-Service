/* eslint-env browser, jquery */
/* global bootbox */

$(function () {
  function reloadStatus () {
    $('#status').load(' #status > *', function () {
      initStatus()
    })
  }

  function initStatus () {
    $('.help-link').click(function () {
      bootbox.alert({
        message: '<img src="/images/help.png" style="max-width: 100%;"/>',
        size: 'large'
      })
    })

    $('.cancel-btn').click(function () {
      bootbox.confirm({
        message: 'Do you really want to cancel the transaction? If you already paid anything, the payment will be lost - cancel only if you have not yet sent any payment!',
        buttons: {
          confirm: {
            label: 'Yes',
            className: 'btn-danger'
          },
          cancel: {
            label: 'No',
            className: 'btn-secondary'
          }
        },
        callback: function (result) {
          if (result) {
            $('.cancel-btn').prop('disabled', true)
            $.post(location.pathname.replace(/\/$/, '') + '/cancel').done(function () {
              reloadStatus()
            }).fail(function () {
              bootbox.alert('There was a problem cancelling your payment!')
            })
          }
        }
      })
    })

    if ($('.redirect').length) {
      setTimeout(function () {
        location.href = $('.redirect').attr('href')
      }, 3000)
    }
  }

  initStatus()
  setInterval(reloadStatus, 10000)
})
