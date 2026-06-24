/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Film, Compass, Heart, Globe, Award } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-app-card border-t border-app-border mt-20 text-app-text-muted py-12 px-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-app-text">
            <div className="w-8 h-8 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-lg flex items-center justify-center font-bold">
              K
            </div>
            <span className="font-extrabold tracking-wider">
              KK<span className="text-amber-500">PHIM</span>
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Ứng dụng xem phim trực tuyến độ phân giải cao hàng đầu, đồng bộ hóa nguồn dữ liệu cập nhật liên tục từ cộng đồng lưu trữ mở tại Việt Nam.
          </p>
        </div>

        {/* Center column */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Liên kết hữu ích</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <a href="https://kkphim1.com/tai-lieu-api" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">
              Tài liệu API KKPhim
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">
              Mã nguồn mở
            </a>
            <span className="text-gray-600">Điều khoản dịch vụ</span>
            <span className="text-gray-600">Chính sách bảo mật</span>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3 text-xs leading-relaxed">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Miễn trừ trách nhiệm</h4>
          <p className="text-gray-600">
            Mọi tệp tin phương tiện và dữ liệu lưu trữ đều được nhúng, chuyển phát trực tiếp từ các máy chủ trung gian công cộng của bên thứ ba. Chúng tôi không lưu giữ hay chịu trách nhiệm quản lý bất kỳ nội dung sở hữu trí tuệ nào.
          </p>
        </div>

      </div>

      <div className="max-w-7xl mx-auto border-t border-app-border mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-gray-600">
        <p>© {currentYear} KKPHIM. Bảo lưu mọi quyền tự do học hỏi.</p>
        <p className="flex items-center gap-1">
          Thiết kế cao cấp bằng <span className="text-rose-500">❤</span> bởi AI Coding Studio
        </p>
      </div>
    </footer>
  );
}
