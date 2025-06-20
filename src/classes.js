"use strict";

import { toPadding, resolve } from "chart.js/helpers";
import positioners from "./positioners.js";
import { textSize, parseFont } from "./custom-helpers";
import customDefaults from "./custom-defaults.js";

var PLUGIN_KEY = customDefaults.PLUGIN_KEY;

function collides(rect, otherRect) {
  return (
    rect.x < otherRect.x + otherRect.width &&
    rect.x + rect.width > otherRect.x &&
    rect.y < otherRect.y + otherRect.height &&
    rect.y + rect.height > otherRect.y
  );
}

export default {
  OutLabel: function (chart, index, ctx, config, context) {
    // Check whether the label should be displayed
    if (!resolve([config.display, true], context, index)) {
      throw new Error("Label display property is set to false.");
    }

    // Init text
    var value = context.dataset.data[index];

    var label = context.labels[index];
    var text = resolve([config.text, customDefaults.text], context, index);
    /* Replace label marker */
    text = text.replace(/%l/gi, label);

    /* Replace value marker with possible precision value */
    text = text.replace(/%v\.?\d*/gi, formatToK(value));




    /* Replace percent marker with possible precision value */
    (text.match(/%p\.?(\d*)/gi) || [])
      .map(function (val) {
        var prec = val.replace(/%p\./gi, "");
        if (prec.length) {
          return +prec;
        }
        return config.percentPrecision || customDefaults.percentPrecision;
      })
      .forEach(function (val) {
        text = text.replace(
          /%p\.?(\d*)/i,
          (context.percent * 100).toFixed(val) + "%"
        );
      });

    // Count lines
    var lines = text.match(/[^\r\n]+/g) || [];

    // Remove unnecessary spaces
    for (var i = 0; i < lines.length; ++i) {
      lines[i] = lines[i].trim();
    }

    /* ===================== CONSTRUCTOR ==================== */
    this.init = function (text, lines) {
      // If everything ok -> begin initializing
      this.encodedText = config.text;
      this.text = text;
      this.lines = lines;
      this.label = label;
      this.value = value;

      // Init style
      this.style = {
        backgroundColor: resolve(
          [config.backgroundColor, customDefaults.backgroundColor, "black"],
          context,
          index
        ),
        borderColor: resolve(
          [config.borderColor, customDefaults.borderColor, "black"],
          context,
          index
        ),
        borderRadius: resolve([config.borderRadius, 0], context, index),
        borderWidth: resolve([config.borderWidth, 0], context, index),
        lineWidth: resolve([config.lineWidth, 2], context, index),
        lineColor: resolve(
          [config.lineColor, customDefaults.lineColor, "black"],
          context,
          index
        ),
        color: resolve([config.color, "white"], context, index),
        font: parseFont(
          resolve([config.font, { resizable: true }]),
          ctx.canvas.style.height.slice(0, -2)
        ),
        padding: toPadding(resolve([config.padding, 0], context, index)),
        textAlign: resolve([config.textAlign, "left"], context, index),
      };

      this.stretch = resolve(
        [config.stretch, customDefaults.stretch],
        context,
        index
      );
      this.horizontalStrechPad = resolve(
        [config.horizontalStrechPad, customDefaults.horizontalStrechPad],
        context,
        index
      );
      this.size = textSize(ctx, this.lines, this.style.font);

      this.offsetStep = this.size.width / 20;
      this.offset = {
        x: 0,
        y: 0,
      };
    };
    function formatToK(value) {
      if (value < 1000) return value.toString();
      const formatted = (value / 1000).toFixed(value % 1000 === 0 ? 0 : 2);
      return `${formatted}K`;
    }

    // Format value thành kiểu 2K43
    const formattedValue = formatToK(value);

    // Chỉ thay %v nếu không có %v.xxx
    if (!/%v\.?\d*/i.test(text)) {
      text = text.replace(/%v/gi, formattedValue);
    }


    const dashIndex = text.indexOf('-');

    if (dashIndex !== -1) {
      const before = text.slice(0, dashIndex + 1);
      const after = text.slice(dashIndex + 1).trim();

      if (after.length > 15) {
        text = before + ' ' + after.slice(0, 15) + "...";
      } else {
        text = before + ' ' + after;
      }
    } else {
      if (text.length > 15) {
        text = text.slice(0, 15) + "...";
      }
    }


    // Đếm số dòng lại (vì text có thể thay đổi)
    lines = text.match(/[^\r\n]+/g) || [];
    lines = lines.map(line => line.trim());
    this.init(text, lines);


    /* COMPUTING RECTS PART */
    this.computeLabelRect = function () {
      var width =
        this.textRect.width +
        2 * this.style.borderWidth +
        this.style.padding.left +
        this.style.padding.right;
      var height =
        this.textRect.height +
        2 * this.style.borderWidth +
        this.style.padding.top +
        this.style.padding.bottom;

      var x = this.textRect.x - this.style.borderWidth;
      var y = this.textRect.y - this.style.borderWidth;

      return {
        x: x,
        y: y,
        width: width,
        height: height,
        isLeft: this.textRect.isLeft,
        isTop: this.textRect.isTop,
      };
    };

    this.computeTextRect = function () {
      const isLeft = this.center.x - this.center.anchor.x < 0;
      const isTop = this.center.y - this.center.anchor.y < 0;
      const shift = isLeft
        ? -(this.horizontalStrechPad + this.size.width)
        : this.horizontalStrechPad;
      return {
        x: this.center.x - this.style.padding.left + shift,
        y: this.center.y - this.size.height / 2,
        width: this.size.width,
        height: this.size.height,
        isLeft,
        isTop,
      };
    };

    /* ======================= DRAWING ======================= */
    // Draw label text
    this.drawText = function (ctx) {
      var align = this.style.textAlign;
      var font = this.style.font;
      var lh = font.lineHeight;
      var color = this.style.color;
      var ilen = this.lines.length;
      var x, y, idx;

      if (!ilen || !color) {
        return;
      }

      x = this.textRect.x;
      y = this.textRect.y + lh / 2;

      if (align === "center") {
        x += this.textRect.width / 2;
      } else if (align === "end" || align === "right") {
        x += this.textRect.width;
      }

      ctx.font = this.style.font.string;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = "middle";

      for (idx = 0; idx < ilen; ++idx) {
        ctx.fillText(
          this.lines[idx],
          Math.round(x) + this.style.padding.left,
          Math.round(y),
          Math.round(this.textRect.width)
        );
        y += lh;
      }
    };

    // Draw label box
    this.drawLabel = function (ctx) {
      ctx.beginPath();

      ctx.roundRect(
        Math.round(this.labelRect.x),
        Math.round(this.labelRect.y),
        Math.round(this.labelRect.width),
        Math.round(this.labelRect.height),
        this.style.borderRadius
      );
      ctx.closePath();

      if (this.style.backgroundColor) {
        ctx.fillStyle = this.style.backgroundColor || "transparent";
        ctx.fill();
      }

      if (this.style.borderColor && this.style.borderWidth) {
        ctx.strokeStyle = this.style.borderColor;
        ctx.lineWidth = this.style.borderWidth;
        ctx.lineJoin = "miter";
        ctx.stroke();
      }
    };

    this.ccw = function (A, B, C) {
      return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    };

    this.intersects = function (A, B, C, D) {
      return (
        this.ccw(A, C, D) !== this.ccw(B, C, D) &&
        this.ccw(A, B, C) !== this.ccw(A, B, D)
      );
    };

    this.drawLine = function (ctx) {
      if (!this.lines.length) {
        return;
      }
      ctx.save();

      ctx.strokeStyle = this.style.lineColor;
      ctx.lineWidth = this.style.lineWidth;
      ctx.lineJoin = "miter";
      ctx.beginPath();
      ctx.moveTo(this.center.anchor.x, this.center.anchor.y);
      ctx.lineTo(this.center.copy.x, this.center.copy.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.center.copy.x, this.center.copy.y);
      const xOffset = this.textRect.width + this.style.padding.width;
      const intersect = this.intersects(
        this.textRect,
        {
          x: this.textRect.x + this.textRect.width,
          y: this.textRect.y + this.textRect.height,
        },
        this.center.copy,
        {
          x: this.textRect.x,
          y: this.textRect.y + this.textRect.height / 2,
        }
      );
      ctx.lineTo(
        this.textRect.x + (intersect ? xOffset : 0),
        this.textRect.y + this.textRect.height / 2
      );
      ctx.stroke();
      ctx.restore();
    };

    this.draw = function (ctx) {
      if (chart.getDataVisibility(index) && !this.hidden) {
        this.drawLabel(ctx);
        this.drawText(ctx);
        this.drawLine(ctx);
      }
    };




    // eslint-disable-next-line max-statements
    this.update = function (view, elements, max) {
      // if (this.value === 0) {
      //   this.hidden = true;
      //   return;
      // }

      this.center = positioners.center(view, this.stretch);

      let valid = false;
      let steps = 5; // Tăng số lần thử đẩy label

      while (!valid && steps > 0) {
        this.textRect = this.computeTextRect();
        this.labelRect = this.computeLabelRect();

        // Nếu label bị đè lên biểu đồ thì ẩn đi
        const label = this.labelRect;
        const r = view.outerRadius;
        const cx = view.x;
        const cy = view.y;

        const overlapsWithPie = [
          { x: label.x, y: label.y },
          { x: label.x + label.width, y: label.y },
          { x: label.x, y: label.y + label.height },
          { x: label.x + label.width, y: label.y + label.height },
        ].some(corner => {
          const dx = corner.x - cx;
          const dy = corner.y - cy;
          return Math.sqrt(dx * dx + dy * dy) < r;
        });


        if (overlapsWithPie) {
          elements[index][PLUGIN_KEY] = null;
          this.hidden = true;
          return;
        }


        valid = true;

        for (var e = 0; e < max; ++e) {
          var element = elements[e][PLUGIN_KEY];
          if (!element || !chart.getDataVisibility(index)) {
            continue;
          }

          if (collides(this.labelRect, element.labelRect)) {
            valid = false;
            break;
          }
        }

        if (!valid) {
          // Thay vì chỉ ẩn, đẩy label đi thêm
          this.offset.x += this.offsetStep;
          this.center.x += this.offsetStep;
          steps--;
          continue;
        }

        steps--;
      }

      // Nếu không hợp lệ sau các bước thử, thay vì ẩn thì remove khỏi elements luôn
      if (!valid) {
        // Loại bỏ label này khỏi elements để không tính đến nữa
        // Cách 1: xóa khỏi mảng elements (nếu elements là mảng có thể sửa)
        // elements.splice(index, 1); // <-- không an toàn nếu đang duyệt elements theo index

        // Cách 2: đánh dấu element này là null hoặc undefined để loại khỏi vòng tính va chạm sau
        elements[index][PLUGIN_KEY] = null;  // Hoặc undefined

        // Đồng thời set hidden để khỏi vẽ
        this.hidden = true;
      } else {
        this.hidden = false;
      }
    };



  },
};