export const facilitySurveySchema = {
  id: "facility-survey-v1",
  title: "Khảo sát cơ sở vật chất",

  fields: [
    {
      id: "facility_name",
      label: "Tên khu vực / phòng",
      type: "text",
      required: true,
    },
    {
      id: "building",
      label: "Tòa nhà",
      type: "radio",
      required: true,
      options: [
        { value: "a", label: "Khu A" },
        { value: "b", label: "Khu B" },
        { value: "c", label: "Khu C" },
        { value: "other", label: "Khác" },
      ],
    },
    {
      id: "building_name",
      label: "Ghi rõ tên tòa nhà",
      type: "text",
      required: true,
      showIf: {
        field: "building",
        equals: "other",
      },
    },
    {
      id: "facility_type",
      label: "Loại hạng mục",
      type: "radio",
      required: true,
      options: [
        { value: "electric", label: "Điện" },
        { value: "water", label: "Nước" },
        { value: "furniture", label: "Bàn ghế" },
        { value: "equipment", label: "Thiết bị" },
        { value: "other", label: "Khác" },
      ],
    },
    {
      id: "other_facility_name",
      label: "Ghi rõ loại hạng mục khác",
      type: "text",
      required: true,
      showIf: {
        field: "facility_type",
        equals: "other",
      },
    },
    {
      id: "condition",
      label: "Tình trạng",
      type: "radio",
      required: true,
      options: [
        { value: "good", label: "Tốt" },
        { value: "damaged", label: "Hư hỏng" },
      ],
    },

    {
      id: "damage_description",
      label: "Mô tả hư hỏng",
      type: "textarea",
      required: true,
      showIf: {
        field: "condition",
        equals: "damaged",
      },
    },

    {
      id: "priority",
      label: "Mức độ ưu tiên xử lý",
      type: "radio",
      options: [
        { value: "low", label: "Thấp" },
        { value: "medium", label: "Trung bình" },
        { value: "high", label: "Cao" },
      ],
      showIf: {
        field: "condition",
        equals: "damaged",
      },
    },
    {
      id: "note",
      label: "Ghi chú thêm",
      type: "textarea",
      required: false,
    },
  ],
};
